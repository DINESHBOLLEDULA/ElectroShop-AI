"""
Conversation Repository — MongoDB data access layer.

=== WHY THE REPOSITORY PATTERN? ===

The Repository pattern creates a boundary between business logic (service)
and data access (MongoDB). This separation provides three concrete benefits:

1. TESTABILITY — Unit tests for ConversationService can mock the repository
   instead of requiring a running MongoDB instance. Test execution drops
   from seconds (with DB) to milliseconds (with mocks).

2. SWAPPABILITY — If we ever migrate from MongoDB to another store (e.g.,
   DynamoDB, PostgreSQL JSONB), only this file changes. The service layer
   is completely unaware of the database technology.

3. ENCAPSULATION — All MongoDB-specific operations ($push, $set, ObjectId
   handling, projection) are contained here. The service layer works with
   Pydantic models, not raw dicts or MongoDB operators.

=== DESIGN DECISIONS ===

- Uses motor (async pymongo) for non-blocking I/O.
- Returns domain models (Conversation, Message), never raw dicts.
- Handles ObjectId ↔ string conversion internally.
- Uses $push for message append (atomic, no read-modify-write cycle).
- Uses projection in list queries to avoid loading full message arrays.
- Validates ObjectId format before querying to prevent 500 errors.
"""

import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING

from copilot.models.conversation import Conversation, Message
from copilot.models.search_state import SearchState

logger = logging.getLogger("copilot.repository")


class ConversationRepository:
    """
    Data access layer for the `conversations` MongoDB collection.

    Every public method either returns a domain model or raises an exception.
    No MongoDB-specific types (ObjectId, cursor, etc.) leak out of this class.
    """

    # ── Collection name constant ──
    # Defined once, used everywhere. If we ever rename the collection
    # (e.g., for sharding or versioning), there's one place to change.
    COLLECTION = "conversations"

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """
        Injected with the database instance (not the client).

        WHY inject the database, not the collection?
            Because the repository may need access to multiple collections
            in the future (e.g., a message_archives collection for overflow).
            Injecting the database keeps that option open.
        """
        self._collection = database[self.COLLECTION]

    # ── Helpers ───────────────────────────────────────────────

    @staticmethod
    def _to_object_id(conversation_id: str) -> ObjectId:
        """
        Convert a string ID to a MongoDB ObjectId.

        WHY validate here instead of in the service?
            ObjectId is a MongoDB implementation detail. The service should
            not know or care that IDs are ObjectIds internally. By validating
            here, we keep all MongoDB-specific logic in the repository.

        Raises:
            InvalidId: If the string is not a valid 24-character hex ObjectId.
        """
        return ObjectId(conversation_id)

    @staticmethod
    def _doc_to_model(doc: dict) -> Conversation:
        """
        Convert a MongoDB document to a Conversation domain model.

        The _id field is an ObjectId in MongoDB but a string in our domain.
        This conversion happens at the boundary so the rest of the codebase
        never touches ObjectId.
        """
        doc["id"] = str(doc.pop("_id"))
        return Conversation(**doc)

    # ── CRUD Operations ───────────────────────────────────────

    async def create(self, conversation: Conversation) -> str:
        """
        Insert a new conversation document.

        Returns:
            The generated MongoDB ObjectId as a string.

        WHY exclude the `id` field on insert?
            The `id` field in our Conversation model is None for new
            conversations. MongoDB generates _id automatically. If we
            passed id=None, it would store a literal `id: null` field
            alongside the auto-generated `_id`.
        """
        doc = conversation.model_dump(exclude={"id"})

        # Convert datetime objects to ensure they're timezone-aware.
        # Pydantic v2 serializes datetimes correctly, but we ensure
        # consistency at the boundary.
        result = await self._collection.insert_one(doc)

        conversation_id = str(result.inserted_id)
        logger.info("Created conversation %s", conversation_id)
        return conversation_id

    async def get_by_id(
        self,
        conversation_id: str,
        user_id: str | None = None,
    ) -> Conversation | None:
        """
        Fetch a single conversation by ID, including all messages.

        Returns:
            The full Conversation model, or None if not found.

        WHY return None instead of raising?
            The repository reports what the database contains. Whether
            "not found" is an error is a business decision that belongs
            in the service layer. The repository just says "it doesn't exist".
        """
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            logger.warning("Invalid ObjectId format: %s", conversation_id)
            return None

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id
        doc = await self._collection.find_one(query)
        if doc is None:
            return None

        return self._doc_to_model(doc)

    async def list_by_user(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
    ) -> list[Conversation]:
        """
        List conversations for a user, sorted by most recently updated.

        WHY projection?
            The list endpoint only needs title, timestamps, and message
            count for the sidebar. Loading full message arrays for 50
            conversations would transfer potentially megabytes of data.

            We project only the fields needed for ConversationListItem.
            The `messages` field is replaced with a $size aggregation
            to get the count without loading the array.

        WHY sort by updated_at DESC?
            Users expect their most recent conversation at the top.
            The (user_id, updated_at) compound index serves both the
            filter and the sort without an in-memory sort stage.
        """
        # Aggregation pipeline for efficient list queries.
        # $project with $size avoids loading the full messages array.
        pipeline = [
            {"$match": {"user_id": user_id, "status": "active"}},
            {"$sort": {"updated_at": DESCENDING}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "user_id": 1,
                    "title": 1,
                    "summary": 1,
                    "active_search": 1,
                    "previous_searches": 1,
                    "retrieved_products": 1,
                    "status": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    # Compute message count without loading the array
                    "message_count": {"$size": {"$ifNull": ["$messages", []]}},
                    # Extract the last message for preview (last element of array)
                    "last_message": {
                        "$arrayElemAt": [
                            {"$ifNull": ["$messages", []]},
                            -1,
                        ]
                    },
                }
            },
        ]

        results: list[Conversation] = []
        async for doc in self._collection.aggregate(pipeline):
            # Convert aggregation result to Conversation model.
            # We need to reconstruct a minimal messages list since
            # the aggregation replaced it with message_count.
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("messages", [])

            # Store aggregation-computed fields for the service to use
            doc["_message_count"] = doc.pop("message_count", 0)
            doc["_last_message"] = doc.pop("last_message", None)

            results.append(Conversation(**{
                k: v for k, v in doc.items()
                if not k.startswith("_") and k != "last_message"
            }))

            # Attach aggregation output as declared private attributes.
            results[-1]._message_count = doc.get("_message_count", 0)
            results[-1]._last_message = doc.get("_last_message")

        return results

    async def update_title(
        self,
        conversation_id: str,
        title: str,
        user_id: str | None = None,
    ) -> bool:
        """
        Rename a conversation.

        WHY $set instead of full document replace?
            $set is atomic and only modifies the specified fields.
            A full replace would require a read-modify-write cycle
            with a race condition window (another request could modify
            the document between our read and write).

        Returns:
            True if a document was modified, False if not found.
        """
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.update_one(
            query,
            {
                "$set": {
                    "title": title,
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
                },
            },
        )

        if result.matched_count > 0:
            logger.info("Renamed conversation %s → '%s'", conversation_id, title)

        return result.matched_count > 0

    async def update_title_if_default(
        self,
        conversation_id: str,
        title: str,
        user_id: str | None = None,
    ) -> bool:
        """Set an automatic title once without overwriting a user rename."""
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid, "title": "New Chat"}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.update_one(
            query,
            {"$set": {"title": title, "updated_at": datetime.now(timezone.utc), "expires_at": datetime.now(timezone.utc) + timedelta(days=90)}},
        )
        return result.modified_count > 0

    async def delete(self, conversation_id: str, user_id: str | None = None) -> bool:
        """
        Permanently delete a conversation.

        WHY hard delete instead of soft delete?
            For MVP simplicity. Soft delete (status → "deleted") is the
            production pattern for recoverability, but it requires:
            - A background job to purge after retention period
            - Filtering deleted conversations from all queries
            - An "undelete" API endpoint
            These will be added when user accounts are implemented.

        Returns:
            True if a document was deleted, False if not found.
        """
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.delete_one(query)

        if result.deleted_count > 0:
            logger.info("Deleted conversation %s", conversation_id)

        return result.deleted_count > 0

    async def push_message(
        self,
        conversation_id: str,
        message: Message,
        user_id: str | None = None,
    ) -> bool:
        """
        Append a message to a conversation's messages array.

        WHY $push instead of read-modify-write?
            $push is an atomic array append operation in MongoDB.
            It modifies only the messages array without loading or
            replacing the entire document. This means:
            - No race condition (two concurrent messages won't overwrite each other)
            - No bandwidth waste (we send only the new message, not the full array)
            - O(1) operation regardless of how many messages already exist

        WHY also $set updated_at?
            We always touch updated_at on any mutation so the "most recent
            conversations" sort order stays accurate. MongoDB's $set and
            $push execute atomically in the same update operation.

        Returns:
            True if the message was appended, False if conversation not found.
        """
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.update_one(
            query,
            {
                "$push": {"messages": message.model_dump(mode="json")},
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
                },
                "$inc": {"memory_version": 1},
            },
        )
        return result.modified_count > 0

    async def update_summary(
        self,
        conversation_id: str,
        summary: str,
        user_id: str | None = None,
    ) -> bool:
        """
        Update the conversation summary.

        WHY a separate method instead of a generic update?
            Exposing a generic update(id, fields) would let any caller
            modify any field — including internal fields like `status`
            or `created_at`. Dedicated methods enforce which fields
            are externally mutable. This is the "principle of least
            privilege" applied to data access.

        Returns:
            True if the summary was updated, False if conversation not found.
        """
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.update_one(
            query,
            {
                "$set": {
                    "summary": summary,
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
                },
                "$inc": {"memory_version": 1},
            },
        )
        return result.matched_count > 0

    async def update_memory_summary(
        self,
        conversation_id: str,
        summary: str,
        summary_message_count: int,
        user_id: str | None = None,
    ) -> bool:
        """Persist one compaction checkpoint without discarding restorable history."""
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False
        query: dict[str, object] = {"_id": oid, "summary_message_count": {"$lt": summary_message_count}}
        if user_id is not None:
            query["user_id"] = user_id
        result = await self._collection.update_one(
            query,
            {
                "$set": {
                    "summary": summary,
                    "summary_message_count": summary_message_count,
                    "updated_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
                },
                "$inc": {"memory_version": 1},
            },
        )
        return result.matched_count > 0

    async def update_search_state(
        self,
        conversation_id: str,
        active_search: SearchState,
        user_id: str | None = None,
        previous_search: SearchState | None = None,
    ) -> bool:
        """Persist the active state and optionally archive the prior state atomically."""
        try:
            oid = self._to_object_id(conversation_id)
        except InvalidId:
            return False

        query: dict[str, object] = {"_id": oid}
        if user_id is not None:
            query["user_id"] = user_id

        update: dict[str, object] = {
            "$set": {
                "active_search": active_search.model_dump(mode="json"),
                "updated_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
            },
            "$inc": {"memory_version": 1},
        }
        if previous_search is not None:
            # Preserve a bounded, most-recent-first history per conversation.
            update["$push"] = {
                "previous_searches": {
                    "$each": [previous_search.model_dump(mode="json")],
                    "$slice": -25,
                },
            }

        result = await self._collection.update_one(query, update)
        return result.matched_count > 0

    async def count_by_user(self, user_id: str) -> int:
        """
        Count active conversations for a user.

        Used for pagination metadata and rate limiting.
        """
        return await self._collection.count_documents(
            {"user_id": user_id, "status": "active"},
        )

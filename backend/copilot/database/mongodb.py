"""
MongoDB connection manager for the Copilot module.

=== WHY THIS EXISTS ===
The existing codebase uses PostgreSQL via SQLAlchemy for product data.
Conversation data has fundamentally different access patterns:

  - Conversations are document-shaped (nested messages, flexible metadata).
  - We always read/write an entire conversation at once.
  - Schema varies per message (some have products, some have search state).
  - We need fast append operations for new messages ($push).

MongoDB is the natural fit for this workload. PostgreSQL stays for products
(structured, relational, already working). This is the "right database for
the right job" principle — not a migration, but an extension.

=== DESIGN DECISIONS ===
1. Singleton pattern — one AsyncIOMotorClient per process. Motor manages
   its own connection pool internally (default 100 connections).
2. Lifespan-managed — connect() on app startup, disconnect() on shutdown.
   No lazy initialization that could fail mid-request.
3. Index creation on startup — ensures indexes exist before any query runs.
   create_indexes() is idempotent (safe to call on every restart).
4. Class-level state — not an instance. FastAPI's DI creates new instances
   per request; the database connection must outlive individual requests.
"""

import logging
from typing import ClassVar

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger("copilot.database")


class MongoDB:
    """
    Manages a singleton MongoDB connection for the application.

    Usage:
        # In FastAPI lifespan:
        await MongoDB.connect("mongodb://localhost:27017")
        yield
        await MongoDB.disconnect()

        # In request handlers / services:
        db = MongoDB.get_database()
    """

    _client: ClassVar[AsyncIOMotorClient | None] = None
    _database: ClassVar[AsyncIOMotorDatabase | None] = None

    # ── Connection Lifecycle ──────────────────────────────────

    @classmethod
    async def connect(
        cls,
        uri: str,
        db_name: str = "electroshop_ai",
    ) -> None:
        """
        Establish the MongoDB connection and create required indexes.

        Args:
            uri: MongoDB connection string (e.g. "mongodb://localhost:27017").
            db_name: Database name. Defaults to "electroshop_ai" to match
                     the existing PostgreSQL database name for consistency.

        Raises:
            ConnectionFailure: If MongoDB is unreachable after retries.
        """
        try:
            cls._client = AsyncIOMotorClient(
                uri,
                # ── Connection pool settings ──
                maxPoolSize=50,           # Max concurrent connections
                minPoolSize=5,            # Keep 5 warm connections
                serverSelectionTimeoutMS=5000,  # Fail fast if server is down
                connectTimeoutMS=5000,
                socketTimeoutMS=30000,    # 30s for long aggregations
                tz_aware=True,            # Preserve UTC-aware datetimes on reads
            )

            # Force a connection attempt now (motor is lazy by default).
            # Without this, connection errors surface on the first request
            # instead of at startup — much harder to debug.
            await cls._client.admin.command("ping")

            cls._database = cls._client[db_name]
            await cls._create_indexes()

            logger.info(
                "MongoDB connected — database=%s, uri=%s",
                db_name,
                uri.split("@")[-1] if "@" in uri else uri,  # Redact credentials
            )

        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            logger.error("MongoDB connection failed: %s", exc)
            cls._client = None
            cls._database = None
            raise

    @classmethod
    async def disconnect(cls) -> None:
        """Close the MongoDB connection and release resources."""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._database = None
            logger.info("MongoDB disconnected")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """
        Return the active database instance.

        Raises:
            RuntimeError: If connect() has not been called or failed.

        Why not lazy-connect here?
            Because connection failures should surface at startup (loud, obvious)
            rather than on a random user request (silent, intermittent).
        """
        if cls._database is None:
            raise RuntimeError(
                "MongoDB is not connected. "
                "Ensure MongoDB.connect() is called during app startup."
            )
        return cls._database

    # ── Index Management ──────────────────────────────────────

    @classmethod
    async def _create_indexes(cls) -> None:
        """
        Create indexes on the conversations collection.

        === INDEX STRATEGY ===

        Index 1: (user_id ASC, updated_at DESC)
            Purpose: List a user's conversations sorted by most recent.
            Query pattern: db.conversations.find({user_id: X}).sort({updated_at: -1})
            Why compound: Avoids an in-memory sort. MongoDB uses the index
            for both the filter AND the sort in a single index scan.

        Index 2: (user_id ASC, status ASC, updated_at DESC)
            Purpose: List a user's active conversations in recency order.
            Query pattern: db.conversations.find({user_id: X, status: "active"})
                         .sort({updated_at: -1})
            Why compound: It serves the list query's filters and sort in one
            index scan, avoiding an in-memory sort.

        Index 3: (status ASC, updated_at ASC)
            Purpose: Background cleanup jobs — find old archived conversations.
            Query pattern: db.conversations.find({status: "archived", updated_at: {$lt: cutoff}})
            Why separate: Cleanup runs infrequently but touches the entire
            collection. A dedicated index prevents it from interfering with
            user-facing queries.

        === WHY NOT INDEX messages.timestamp? ===
        Messages are embedded in the conversation document. We never query
        messages across conversations ("find all messages from user X").
        We always load the full conversation and access messages in-memory.
        An index on a nested array field would bloat storage for zero benefit.
        """
        db = cls.get_database()
        conversations = db["conversations"]

        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("updated_at", DESCENDING)],
                name="idx_user_recent",
            ),
            IndexModel(
                [
                    ("user_id", ASCENDING),
                    ("status", ASCENDING),
                    ("updated_at", DESCENDING),
                ],
                name="idx_user_status_recent",
            ),
            IndexModel(
                [("status", ASCENDING), ("updated_at", ASCENDING)],
                name="idx_status_updated",
            ),
            IndexModel(
                [("expires_at", ASCENDING)],
                name="idx_conversation_expiry",
                expireAfterSeconds=0,
            ),
        ]

        await conversations.create_indexes(indexes)
        logger.info(
            "MongoDB indexes ensured: %s",
            [idx.document["name"] for idx in indexes],
        )

"""
Conversation Service — business logic layer.

=== WHY A SEPARATE SERVICE LAYER? ===

The repository handles HOW data is stored/retrieved.
The service handles WHAT business rules apply.

Without this separation:
  - Validation logic ends up in the router (mixing HTTP with business rules).
  - Business rules leak into the repository (coupling data access to domain logic).
  - Testing requires a running database even for pure business logic tests.

The service layer is the ONLY place where:
  - Input validation beyond Pydantic schema validation happens.
  - Business rules are enforced (e.g., auto-titling, title length limits).
  - Domain models are converted to API response models.
  - Cross-cutting concerns like logging are applied.

=== DESIGN DECISIONS ===

1. Constructor injection — the repository is injected, not imported.
   This enables testing with mock repositories and swapping storage backends.

2. Returns API response models — the service converts domain models to
   response schemas so the router never touches domain internals.

3. Raises domain exceptions — ConversationNotFoundError, InvalidConversationError.
   The router maps these to HTTP status codes.

4. Auto-title on first user message — if the conversation has no messages yet
   and the first user message arrives, we set the title to the first ~100
   characters of that message. This mimics ChatGPT's behavior where chats
   are auto-titled from the first prompt.
"""

from __future__ import annotations

import logging
import asyncio
from typing import TYPE_CHECKING

from copilot.exceptions import ConversationNotFoundError, InvalidConversationError
from copilot.models.conversation import (
    Conversation,
    ConversationDetail,
    ConversationListItem,
    Message,
    MessageMetadata,
    MessageResponse,
)
from copilot.models.search_state import SearchState, SearchStateCommand
from copilot.models.intent import IntentClassification
from copilot.models.query_plan import QueryGenerationContext, QueryPlan, RecentMessage
from copilot.models.memory import DeviceSyncResponse, MemoryContext
from copilot.service.intent_classifier import IntentClassifier
from copilot.service.query_generator import QueryGenerator
from copilot.service.memory_manager import MemoryManager
from copilot.service.search_state_manager import SearchStateManager

if TYPE_CHECKING:
    from copilot.repository.conversation_repository import ConversationRepository

logger = logging.getLogger("copilot.service")


class ConversationService:
    """
    Business logic for conversation CRUD operations.

    This class contains zero database-specific code. It works entirely
    through the ConversationRepository abstraction.
    """

    def __init__(
        self,
        repository: ConversationRepository,
        search_state_manager: SearchStateManager | None = None,
        intent_classifier: IntentClassifier | None = None,
        query_generator: QueryGenerator | None = None,
        memory_manager: MemoryManager | None = None,
    ) -> None:
        """
        Args:
            repository: Data access layer for conversations.
                        Injected to enable testing and storage swapping.
        """
        self._repo = repository
        self._search_state_manager = search_state_manager or SearchStateManager()
        self._intent_classifier = intent_classifier
        self._query_generator = query_generator
        self._memory_manager = memory_manager

    # ══════════════════════════════════════════════════════════
    # CREATE
    # ══════════════════════════════════════════════════════════

    async def create_conversation(
        self,
        user_id: str = "default",
        title: str | None = None,
    ) -> ConversationDetail:
        """
        Create a new empty conversation.

        Args:
            user_id: Owner of the conversation. Defaults to "default"
                     until authentication is implemented.
            title: Optional custom title. If None, defaults to "New Chat"
                   and will be auto-titled from the first user message.

        Returns:
            The created conversation with full detail.

        WHY return the full ConversationDetail immediately?
            The client needs the conversation ID to start sending messages.
            Returning the full object saves a follow-up GET request.
        """
        user_id = user_id.strip()
        if not user_id:
            raise InvalidConversationError("User ID cannot be empty")

        normalized_title = self._normalize_title(title) if title is not None else "New Chat"
        conversation = Conversation(user_id=user_id, title=normalized_title)

        conversation_id = await self._repo.create(conversation)
        conversation.id = conversation_id

        logger.info(
            "Created conversation %s for user %s (title=%r)",
            conversation_id,
            user_id,
            conversation.title,
        )

        return self._to_detail(conversation)

    # ══════════════════════════════════════════════════════════
    # READ
    # ══════════════════════════════════════════════════════════

    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str = "default",
    ) -> ConversationDetail:
        """
        Load a conversation with its full message history.

        Raises:
            ConversationNotFoundError: If the conversation ID doesn't exist
                                       or has an invalid format.
        """
        conversation = await self._repo.get_by_id(conversation_id, user_id)
        if conversation is None:
            raise ConversationNotFoundError(conversation_id)

        return self._to_detail(conversation)

    async def list_conversations(
        self,
        user_id: str = "default",
        limit: int = 50,
        skip: int = 0,
    ) -> list[ConversationListItem]:
        """
        List conversations for the sidebar, sorted by most recently updated.

        WHY limit is capped at 100?
            Fetching 1000 conversations in one request would be slow and
            wastes bandwidth. The frontend should paginate using skip/limit.
            The cap is enforced in the router, but the service also protects
            against misuse.

        WHY return ConversationListItem instead of ConversationDetail?
            The list view doesn't need full message history. Sending
            lightweight items reduces response size from potentially
            megabytes to kilobytes.
        """
        limit = min(limit, 100)  # Safety cap
        conversations = await self._repo.list_by_user(user_id, limit, skip)
        return [self._to_list_item(c) for c in conversations]

    # ══════════════════════════════════════════════════════════
    # UPDATE
    # ══════════════════════════════════════════════════════════

    async def rename_conversation(
        self,
        conversation_id: str,
        title: str,
        user_id: str = "default",
    ) -> ConversationDetail:
        """
        Rename a conversation.

        Business rules:
            - Title must be non-empty after stripping whitespace.
            - Title must be 200 characters or fewer.
            - Leading/trailing whitespace is stripped.

        WHY strip whitespace?
            Users often paste text with trailing newlines or spaces.
            Storing "  Gaming Phones  \\n" as a title looks broken in the UI.

        Raises:
            InvalidConversationError: If the title is empty or too long.
            ConversationNotFoundError: If the conversation doesn't exist.
        """
        title = self._normalize_title(title)

        success = await self._repo.update_title(conversation_id, title, user_id)
        if not success:
            raise ConversationNotFoundError(conversation_id)

        logger.info("Renamed conversation %s → %r", conversation_id, title)
        return await self.get_conversation(conversation_id, user_id)

    async def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: MessageMetadata | None = None,
        user_id: str = "default",
    ) -> MessageResponse:
        """
        Append a message to a conversation.

        Business rules:
            - Content must be non-empty.
            - If this is the first user message AND the title is still
              "New Chat", auto-title the conversation from the message content.

        WHY auto-title?
            In ChatGPT, Gemini, and Claude — when you send your first message,
            the chat title updates automatically. Users expect this behavior.
            Manual titling is friction; auto-titling is delight.

        WHY check for "New Chat" specifically?
            If the user created the conversation with a custom title
            (via CreateConversationRequest.title), we should respect
            their choice and NOT overwrite it.

        Returns:
            The saved message with its generated ID and timestamp.

        Raises:
            ConversationNotFoundError: If the conversation doesn't exist.
        """
        # Verify conversation exists and get current state for auto-title logic
        if not content.strip():
            raise InvalidConversationError("Message content cannot be empty")

        conversation = await self._repo.get_by_id(conversation_id, user_id)
        if conversation is None:
            raise ConversationNotFoundError(conversation_id)

        resolved_metadata = metadata or MessageMetadata()
        if role == "user" and self._intent_classifier is not None:
            classification = await asyncio.to_thread(self._intent_classifier.classify, content)
            resolved_metadata = resolved_metadata.model_copy(
                update={
                    "intent": classification.intent.value,
                    "intent_confidence": classification.confidence,
                    "intent_fallback_used": classification.fallback_used,
                },
            )

        message = Message(
            role=role,
            content=content,
            metadata=resolved_metadata,
        )

        success = await self._repo.push_message(conversation_id, message, user_id)
        if not success:
            raise ConversationNotFoundError(conversation_id)

        # Auto-title: first user message + title is still default
        if (
            role == "user"
            and len(conversation.messages) == 0
            and conversation.title == "New Chat"
        ):
            auto_title = content[:100].strip()
            if auto_title:
                if await self._repo.update_title_if_default(
                    conversation_id,
                    auto_title,
                    user_id,
                ):
                    logger.info(
                        "Auto-titled conversation %s → %r",
                        conversation_id,
                        auto_title,
                    )

        if self._memory_manager is not None:
            refreshed = await self._repo.get_by_id(conversation_id, user_id)
            if refreshed is not None:
                checkpoint = self._memory_manager.summarize_next_batch(refreshed)
                if checkpoint is not None:
                    summary, summarized_count = checkpoint
                    await self._repo.update_memory_summary(
                        conversation_id,
                        summary,
                        summarized_count,
                        user_id,
                    )

        logger.info(
            "Saved %s message to conversation %s (msg_id=%s)",
            role,
            conversation_id,
            message.id,
        )

        return MessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            timestamp=message.timestamp,
            metadata=message.metadata,
        )

    async def update_summary(
        self,
        conversation_id: str,
        summary: str,
        user_id: str = "default",
    ) -> ConversationDetail:
        """
        Update the conversation summary.

        WHY is this a separate endpoint?
            Summaries are generated asynchronously by the Memory Manager
            (future phase). The flow is:
            1. Conversation reaches N turns.
            2. Memory Manager triggers a background summarization.
            3. Memory Manager calls this endpoint to persist the summary.

            This decouples summarization from the real-time chat flow.

        Raises:
            ConversationNotFoundError: If the conversation doesn't exist.
        """
        summary = summary.strip()
        if not summary:
            raise InvalidConversationError("Summary cannot be empty")

        success = await self._repo.update_summary(conversation_id, summary, user_id)
        if not success:
            raise ConversationNotFoundError(conversation_id)

        logger.info("Updated summary for conversation %s", conversation_id)
        return await self.get_conversation(conversation_id, user_id)

    async def update_search_state(
        self,
        conversation_id: str,
        command: SearchStateCommand,
        user_id: str = "default",
    ) -> SearchState:
        """Apply one typed filter command; the chat transcript is never read."""
        conversation = await self._repo.get_by_id(conversation_id, user_id)
        if conversation is None:
            raise ConversationNotFoundError(conversation_id)

        transition = self._search_state_manager.apply(conversation.active_search, command)
        previous_search = conversation.active_search if transition.archive_previous else None
        success = await self._repo.update_search_state(
            conversation_id,
            transition.state,
            user_id,
            previous_search,
        )
        if not success:
            raise ConversationNotFoundError(conversation_id)
        logger.info("Applied %s search-state command to conversation %s", command.operation, conversation_id)
        return transition.state

    async def generate_query_plan(
        self,
        conversation_id: str,
        intent: IntentClassification,
        user_id: str = "default",
    ) -> QueryPlan:
        """Generate a read-only intermediate plan from stored state and recent messages."""
        if self._query_generator is None:
            raise RuntimeError("Query generator is not configured")
        conversation = await self._repo.get_by_id(conversation_id, user_id)
        if conversation is None:
            raise ConversationNotFoundError(conversation_id)
        if not conversation.messages:
            raise InvalidConversationError("At least one saved message is required to generate a query plan")

        context = QueryGenerationContext(
            intent=intent,
            current_filters=conversation.active_search,
            recent_messages=[
                RecentMessage(role=message.role, content=message.content)
                for message in conversation.messages[-8:]
            ],
        )
        return await asyncio.to_thread(self._query_generator.generate, context)

    async def get_memory_context(
        self,
        conversation_id: str,
        token_budget: int = 3_000,
        user_id: str = "default",
    ) -> MemoryContext:
        if self._memory_manager is None:
            raise RuntimeError("Memory manager is not configured")
        conversation = await self._repo.get_by_id(conversation_id, user_id)
        if conversation is None:
            raise ConversationNotFoundError(conversation_id)
        return self._memory_manager.build_context(conversation, token_budget)

    async def sync_memory(
        self,
        conversation_id: str,
        known_memory_version: int | None,
        token_budget: int,
        user_id: str = "default",
    ) -> DeviceSyncResponse:
        context = await self.get_memory_context(conversation_id, token_budget, user_id)
        if known_memory_version == context.memory_version:
            return DeviceSyncResponse(changed=False)
        return DeviceSyncResponse(changed=True, context=context)

    # ══════════════════════════════════════════════════════════
    # DELETE
    # ══════════════════════════════════════════════════════════

    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str = "default",
    ) -> bool:
        """
        Permanently delete a conversation and all its messages.

        WHY permanent delete and not soft delete?
            For MVP simplicity. When user authentication is added,
            soft delete (status → "deleted") with a retention period
            will replace this. For now, delete means delete.

        Raises:
            ConversationNotFoundError: If the conversation doesn't exist.
        """
        success = await self._repo.delete(conversation_id, user_id)
        if not success:
            raise ConversationNotFoundError(conversation_id)

        logger.info("Deleted conversation %s", conversation_id)
        return True

    # ══════════════════════════════════════════════════════════
    # PRIVATE — Model Conversion
    # ══════════════════════════════════════════════════════════

    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalize titles consistently for create and rename operations."""
        normalized_title = title.strip()
        if not normalized_title:
            raise InvalidConversationError("Title cannot be empty")
        if len(normalized_title) > 200:
            raise InvalidConversationError("Title must be 200 characters or fewer")
        return normalized_title

    @staticmethod
    def _to_detail(conversation: Conversation) -> ConversationDetail:
        """
        Convert an internal Conversation model to an API response.

        WHY explicit conversion instead of Conversation.model_dump()?
            1. The API response has a different shape (MessageResponse
               instead of Message).
            2. We can exclude internal fields (status) if needed.
            3. Type safety — the return type is guaranteed to match the
               OpenAPI schema.
        """
        return ConversationDetail(
            id=conversation.id or "",
            user_id=conversation.user_id,
            title=conversation.title,
            messages=[
                MessageResponse(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp,
                    metadata=msg.metadata,
                )
                for msg in conversation.messages
            ],
            summary=conversation.summary,
            summary_message_count=conversation.summary_message_count,
            active_search=conversation.active_search,
            previous_searches=conversation.previous_searches,
            retrieved_products=conversation.retrieved_products,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            memory_version=conversation.memory_version,
            expires_at=conversation.expires_at,
        )

    @staticmethod
    def _to_list_item(conversation: Conversation) -> ConversationListItem:
        """
        Convert an internal Conversation to a lightweight list item.

        Uses precomputed _message_count and _last_message from the
        repository's aggregation pipeline when available, falling back
        to computing them from the messages array.
        """
        # Try aggregation-computed values first (from list_by_user)
        message_count = getattr(conversation, "_message_count", None)
        if message_count is None:
            message_count = len(conversation.messages)

        last_message = getattr(conversation, "_last_message", None)
        if last_message is not None:
            preview = last_message.get("content", "")[:120]
        elif conversation.messages:
            preview = conversation.messages[-1].content[:120]
        else:
            preview = None

        return ConversationListItem(
            id=conversation.id or "",
            title=conversation.title,
            message_count=message_count,
            last_message_preview=preview,
            updated_at=conversation.updated_at,
            created_at=conversation.created_at,
        )

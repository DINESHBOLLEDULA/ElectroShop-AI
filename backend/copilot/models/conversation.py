"""
Conversation domain models and API schemas.

=== ARCHITECTURE DECISION: EMBEDDED vs REFERENCED MESSAGES ===

We embed messages inside the conversation document rather than storing
them in a separate collection. Here's the reasoning:

  EMBEDDED (chosen):
  ✓ Single read fetches the full conversation — critical for building
    LLM context windows where we need all recent messages.
  ✓ Atomic writes — $push to the messages array is atomic. No risk of
    a message being saved while the conversation is in an inconsistent state.
  ✓ No joins — MongoDB has no native JOINs. A reference-based design
    would require application-level joins or $lookup aggregations.
  ✗ 16 MB document limit — a conversation would need ~50,000 messages
    to hit this. Shopping conversations average 10–30 turns.

  REFERENCED (rejected for now):
  ✓ No document size limit.
  ✓ Can query individual messages across conversations.
  ✗ Every history load requires a second query.
  ✗ No atomicity across conversation + messages.

  Future: If conversations grow beyond ~500 messages, we will summarize
  older messages and archive them to a separate collection (Memory Manager).

=== ARCHITECTURE DECISION: SEPARATE REQUEST/RESPONSE MODELS ===

We never expose internal domain models directly through the API.

  - CreateConversationRequest has only the fields the client should set.
  - ConversationDetail has only the fields the client should see.
  - Conversation (internal) has fields like `status` that the client
    should not control directly.

This follows the CQS (Command-Query Separation) principle at the API level
and prevents accidental mass-assignment vulnerabilities.

=== ARCHITECTURE DECISION: user_id DEFAULTS TO "default" ===

The system is designed for multi-user from day one, but authentication
is not yet implemented. Defaulting to "default" means:
  - All conversations are accessible without auth (current behavior).
  - When auth is added, we just inject the real user_id — zero refactoring.
  - The MongoDB index on (user_id, updated_at) is already partitioned correctly.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, PrivateAttr

from copilot.models.search_state import SearchState


# ════════════════════════════════════════════════════════════════
# DOMAIN MODELS — internal representation, stored in MongoDB
# ════════════════════════════════════════════════════════════════


class MessageMetadata(BaseModel):
    """
    Optional metadata attached to a chat message.

    WHY: Different messages carry different context. A user message
    might have intent classification results. An assistant message
    might reference which products were shown. Keeping this as a
    flexible sub-document means we can add fields without a schema
    migration.
    """

    intent: str | None = None
    intent_confidence: float | None = Field(default=None, ge=0, le=1)
    intent_fallback_used: bool | None = None
    products_shown: list[int] = Field(default_factory=list)
    query_parsed: dict[str, Any] | None = None
    response_time_ms: int | None = None


class Message(BaseModel):
    """
    A single message in a conversation.

    WHY UUID for id:
        MongoDB ObjectIds are 12-byte and tied to the server clock.
        Messages are created in application code, not by MongoDB
        ($push doesn't generate _id for array elements). UUID4 gives
        us globally unique, collision-free IDs without a database call.

    WHY timestamp defaults to utcnow:
        All timestamps are stored in UTC. The frontend converts to local
        time for display. This avoids timezone bugs when conversations
        span multiple sessions.
    """

    id: str = Field(default_factory=lambda: str(uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    metadata: MessageMetadata = Field(default_factory=MessageMetadata)


class Conversation(BaseModel):
    """
    The core domain model — a single chat session.

    This maps 1:1 to a document in the `conversations` MongoDB collection.
    """

    id: str | None = None  # MongoDB ObjectId serialized as string
    user_id: str = "default"
    title: str = "New Chat"
    messages: list[Message] = Field(default_factory=list)
    summary: str | None = None
    summary_message_count: int = Field(default=0, ge=0)
    active_search: SearchState | None = None
    previous_searches: list[SearchState] = Field(default_factory=list)
    retrieved_products: list[int] = Field(default_factory=list)
    status: Literal["active", "archived"] = "active"
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    memory_version: int = Field(default=1, ge=1)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=90),
    )

    # Populated only by the repository's list aggregation. These fields are
    # neither persisted nor exposed by the HTTP API.
    _message_count: int | None = PrivateAttr(default=None)
    _last_message: dict[str, Any] | None = PrivateAttr(default=None)


# ════════════════════════════════════════════════════════════════
# API REQUEST SCHEMAS — what the client sends
# ════════════════════════════════════════════════════════════════


class CreateConversationRequest(BaseModel):
    """POST /v2/copilot/conversations — create a new chat."""

    user_id: str = Field(default="default", min_length=1, max_length=128)
    title: str | None = None  # None → auto-titled from first message


class RenameConversationRequest(BaseModel):
    """PATCH /v2/copilot/conversations/{id} — rename an existing chat."""

    title: str = Field(..., min_length=1, max_length=200)


class SaveMessageRequest(BaseModel):
    """POST /v2/copilot/conversations/{id}/messages — append a message."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=50_000)
    metadata: MessageMetadata | None = None


class UpdateSummaryRequest(BaseModel):
    """PUT /v2/copilot/conversations/{id}/summary — update conversation summary."""

    summary: str = Field(..., min_length=1, max_length=10_000)


# ════════════════════════════════════════════════════════════════
# API RESPONSE SCHEMAS — what the client receives
# ════════════════════════════════════════════════════════════════


class MessageResponse(BaseModel):
    """A single message as returned by the API."""

    id: str
    role: str
    content: str
    timestamp: datetime
    metadata: MessageMetadata


class ConversationListItem(BaseModel):
    """
    Lightweight representation for the chat list sidebar.

    WHY a separate model:
        The chat list shows dozens of conversations. Sending the full
        message history for every conversation in the list would be
        wasteful (potentially megabytes of data). This model sends only
        what the sidebar needs: title, timestamp, and a preview.
    """

    id: str
    title: str
    message_count: int
    last_message_preview: str | None = None
    updated_at: datetime
    created_at: datetime


class ConversationDetail(BaseModel):
    """
    Full conversation data returned when opening a specific chat.

    Includes the complete message history, search state, and metadata.
    """

    id: str
    user_id: str
    title: str
    messages: list[MessageResponse]
    summary: str | None
    summary_message_count: int
    active_search: SearchState | None
    previous_searches: list[SearchState]
    retrieved_products: list[int]
    created_at: datetime
    updated_at: datetime
    memory_version: int
    expires_at: datetime

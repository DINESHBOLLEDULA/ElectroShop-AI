"""Contracts for bounded conversational memory and multi-device synchronization."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from copilot.models.conversation import MessageResponse
from copilot.models.search_state import SearchState


class MemoryContext(BaseModel):
    """The only conversation context passed to downstream LLM stages."""

    model_config = ConfigDict(extra="forbid")
    summary: str | None
    recent_messages: list[MessageResponse]
    search_state: SearchState | None
    retrieved_products: list[int]
    estimated_tokens: int = Field(ge=0)
    token_budget: int = Field(ge=256)
    memory_version: int = Field(ge=1)
    expires_at: datetime


class DeviceSyncRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    device_id: str = Field(min_length=1, max_length=128)
    known_memory_version: int | None = Field(default=None, ge=1)
    token_budget: int = Field(default=3_000, ge=256, le=16_000)


class DeviceSyncResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    changed: bool
    context: MemoryContext | None = None

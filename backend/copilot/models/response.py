"""Strict schemas for grounded response planning and rendering."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from copilot.models.retrieval import ProductCandidate
from copilot.models.search_state import SearchState


class EvidenceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: str = Field(min_length=1, max_length=128)
    field: str = Field(min_length=1, max_length=80)


class ResponsePlan(BaseModel):
    """LLM output that selects catalog facts; it contains no free-form claims."""

    model_config = ConfigDict(extra="forbid")
    recommendation_ids: list[str] = Field(default_factory=list, max_length=3)
    alternative_ids: list[str] = Field(default_factory=list, max_length=3)
    comparison_ids: list[str] = Field(default_factory=list, max_length=4)
    comparison_fields: list[str] = Field(default_factory=list, max_length=6)
    pros: list[EvidenceRef] = Field(default_factory=list, max_length=8)
    cons: list[EvidenceRef] = Field(default_factory=list, max_length=8)


class ResponseGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=2_000)
    current_search: SearchState | None = None
    products: list[ProductCandidate] = Field(min_length=1, max_length=30)


class GeneratedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(min_length=1)
    plan: ResponsePlan
    fallback_used: bool = False

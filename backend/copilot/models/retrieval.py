"""Typed contracts for semantic expansion and hybrid product retrieval."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from copilot.models.product_query import ProductQueryRequest


class SemanticQuery(BaseModel):
    """Validated LLM-created text for embedding; it is not a database query."""

    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=500)
    fallback_used: bool = False


class HybridSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=2_000)
    filters: ProductQueryRequest = Field(default_factory=ProductQueryRequest)
    top_k: int = Field(default=30, ge=1, le=30)


class ProductCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    brand: str | None = None
    category: str | None = None
    price: float | None = None
    rating: float | None = None
    reviews: int = 0
    in_stock: bool | None = None
    specs: dict[str, Any] = Field(default_factory=dict)
    semantic_score: float | None = None
    ranking_score: float = 0


class HybridRetrievalResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    strategy: Literal["semantic", "metadata_fallback"]
    semantic_query: SemanticQuery
    products: list[ProductCandidate]
    fallback_reason: str | None = None

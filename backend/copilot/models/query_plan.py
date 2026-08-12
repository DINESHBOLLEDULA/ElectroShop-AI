"""Validated intermediate query format; deliberately independent of MongoDB."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from copilot.models.intent import Intent, IntentClassification
from copilot.models.search_state import FilterName, SearchState, SearchStatePatch


QueryOperation = Literal["merge", "replace", "remove", "reset", "none"]


class RecentMessage(BaseModel):
    """Minimal bounded context sent to the query-generation model."""

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=5_000)


class QueryGenerationContext(BaseModel):
    """All inputs required to generate a plan, without database-query syntax."""

    model_config = ConfigDict(extra="forbid")

    intent: IntentClassification
    current_filters: SearchState | None = None
    recent_messages: list[RecentMessage] = Field(min_length=1, max_length=8)


class QueryPlan(SearchStatePatch):
    """Strict intermediate representation for a later state/search orchestration step."""

    model_config = ConfigDict(extra="forbid")

    intent: Intent
    operation: QueryOperation
    remove_filters: list[FilterName] = Field(default_factory=list, max_length=14)

    @model_validator(mode="after")
    def validate_plan(self) -> QueryPlan:
        filter_values = {
            name: value
            for name, value in self.model_dump(exclude_unset=True).items()
            if name not in {"intent", "operation", "remove_filters"}
        }
        if any(value is None for value in filter_values.values()):
            raise ValueError("Use remove_filters rather than null filter values")
        if self.operation in {"merge", "replace"} and not filter_values:
            raise ValueError(f"{self.operation} requires at least one filter")
        if self.operation == "remove" and not self.remove_filters:
            raise ValueError("remove requires at least one remove_filters value")
        if self.operation in {"reset", "none"} and (filter_values or self.remove_filters):
            raise ValueError(f"{self.operation} cannot contain filters")
        return self


class GenerateQueryPlanRequest(BaseModel):
    """API input: intent is already validated by the classification stage."""

    model_config = ConfigDict(extra="forbid")

    intent: IntentClassification


# This JSON Schema is supplied to the LLM and can also be published to clients.
QUERY_PLAN_JSON_SCHEMA = QueryPlan.model_json_schema()

"""Strict contracts for classifying conversational shopping intents."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Intent(StrEnum):
    CONTINUE = "CONTINUE"
    MODIFY = "MODIFY"
    REMOVE_FILTER = "REMOVE_FILTER"
    NEW_SEARCH = "NEW_SEARCH"
    COMPARE = "COMPARE"
    QUESTION = "QUESTION"
    SORT = "SORT"
    PAGINATE = "PAGINATE"
    CLARIFY = "CLARIFY"
    RETURN_RESULTS = "RETURN_RESULTS"


class IntentClassification(BaseModel):
    """Validated output of the intent classifier; never an untrusted LLM dict."""

    model_config = ConfigDict(extra="forbid")

    intent: Intent
    confidence: float = Field(ge=0, le=1)
    clarification_question: str | None = Field(default=None, max_length=500)
    fallback_used: bool = False

    @model_validator(mode="after")
    def validate_clarification(self) -> IntentClassification:
        if self.intent == Intent.CLARIFY and not self.clarification_question:
            raise ValueError("CLARIFY intent requires clarification_question")
        if self.intent != Intent.CLARIFY and self.clarification_question is not None:
            raise ValueError("clarification_question is allowed only for CLARIFY")
        return self


class ClassifyIntentRequest(BaseModel):
    """Input accepted by the classification API."""

    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=5_000)

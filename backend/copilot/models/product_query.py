"""Strict, database-safe product query contracts for MongoDB compilation."""

from __future__ import annotations

import re
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BooleanMode(StrEnum):
    AND = "AND"
    OR = "OR"


class SortField(StrEnum):
    PRICE = "price"
    RATING = "rating"
    REVIEWS = "reviews"
    NAME = "name"


class SortDirection(StrEnum):
    ASC = "asc"
    DESC = "desc"


class NumericRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    minimum: float | None = Field(default=None, ge=0)
    maximum: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_range(self) -> NumericRange:
        if self.minimum is None and self.maximum is None:
            raise ValueError("A range requires minimum or maximum")
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("minimum cannot exceed maximum")
        return self


class SafeRegex(BaseModel):
    """Literal text is escaped before compiling to prevent regex/operator injection."""

    model_config = ConfigDict(extra="forbid")

    value: str = Field(min_length=1, max_length=64)
    mode: Literal["contains", "prefix", "exact"] = "contains"


class SpecFilter(BaseModel):
    """One validated predicate against a nested `specs.<field>` property."""

    model_config = ConfigDict(extra="forbid")

    field: str = Field(min_length=1, max_length=64)
    equals: str | int | float | bool | None = None
    range: NumericRange | None = None
    regex: SafeRegex | None = None

    @field_validator("field")
    @classmethod
    def validate_field_name(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,63}", value):
            raise ValueError("spec field must be a simple identifier")
        return value

    @model_validator(mode="after")
    def validate_one_operator(self) -> SpecFilter:
        operators = [self.equals is not None, self.range is not None, self.regex is not None]
        if sum(operators) != 1:
            raise ValueError("Specify exactly one of equals, range, or regex")
        return self


class ProductQueryRequest(BaseModel):
    """The only accepted input to the Mongo query compiler."""

    model_config = ConfigDict(extra="forbid")

    categories: list[str] = Field(default_factory=list, max_length=20)
    brands: list[str] = Field(default_factory=list, max_length=20)
    brand_regex: SafeRegex | None = None
    price: NumericRange | None = None
    specs: list[SpecFilter] = Field(default_factory=list, max_length=20)
    mode: BooleanMode = BooleanMode.AND
    sort_by: SortField = SortField.RATING
    sort_direction: SortDirection = SortDirection.DESC
    page: int = Field(default=1, ge=1, le=1_000)
    page_size: int = Field(default=20, ge=1, le=100)
    include_total: bool = False

    @field_validator("categories", "brands")
    @classmethod
    def normalize_values(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value for value in normalized):
            raise ValueError("category and brand values cannot be blank")
        return list(dict.fromkeys(normalized))


class IndexSuggestion(BaseModel):
    fields: list[tuple[str, int]]
    reason: str


class QueryComplexity(BaseModel):
    level: Literal["low", "medium", "high"]
    estimated_cost: str
    reasons: list[str]


class CompiledMongoQuery(BaseModel):
    """Safe output for the repository layer; no executable code is generated."""

    model_config = ConfigDict(extra="forbid")

    strategy: Literal["find", "aggregate"]
    filter: dict[str, object] | None = None
    sort: list[tuple[str, int]]
    skip: int = Field(ge=0)
    limit: int = Field(ge=1)
    pipeline: list[dict[str, object]] | None = None
    index_suggestions: list[IndexSuggestion]
    complexity: QueryComplexity

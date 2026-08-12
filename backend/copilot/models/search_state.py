"""Typed search state contracts used by the conversational shopping flow."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SearchSort(StrEnum):
    RECOMMENDED = "recommended"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    RATING_DESC = "rating_desc"


class SearchState(BaseModel):
    """The complete, validated set of filters for one conversation."""

    model_config = ConfigDict(extra="forbid")

    category: str | None = Field(default=None, min_length=1, max_length=100)
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    min_price: int | None = Field(default=None, ge=0)
    max_price: int | None = Field(default=None, ge=0)
    ram_gb: int | None = Field(default=None, gt=0, le=512)
    storage_gb: int | None = Field(default=None, gt=0, le=8192)
    display: str | None = Field(default=None, min_length=1, max_length=100)
    camera: str | None = Field(default=None, min_length=1, max_length=100)
    min_battery_mah: int | None = Field(default=None, gt=0, le=100_000)
    chipset: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, min_length=1, max_length=100)
    min_rating: float | None = Field(default=None, ge=0, le=5)
    sort: SearchSort | None = None
    in_stock: bool | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def validate_price_range(self) -> SearchState:
        if self.min_price is not None and self.max_price is not None and self.min_price > self.max_price:
            raise ValueError("min_price cannot exceed max_price")
        return self

    def has_filters(self) -> bool:
        return any(
            value is not None
            for name, value in self.model_dump().items()
            if name != "updated_at"
        )


class SearchStatePatch(BaseModel):
    """A partial filter update. Omitted fields are deliberately unchanged."""

    model_config = ConfigDict(extra="forbid")

    category: str | None = Field(default=None, min_length=1, max_length=100)
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    min_price: int | None = Field(default=None, ge=0)
    max_price: int | None = Field(default=None, ge=0)
    ram_gb: int | None = Field(default=None, gt=0, le=512)
    storage_gb: int | None = Field(default=None, gt=0, le=8192)
    display: str | None = Field(default=None, min_length=1, max_length=100)
    camera: str | None = Field(default=None, min_length=1, max_length=100)
    min_battery_mah: int | None = Field(default=None, gt=0, le=100_000)
    chipset: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, min_length=1, max_length=100)
    min_rating: float | None = Field(default=None, ge=0, le=5)
    sort: SearchSort | None = None
    in_stock: bool | None = None


FilterName = Literal[
    "category", "brand", "min_price", "max_price", "ram_gb", "storage_gb",
    "display", "camera", "min_battery_mah", "chipset", "color", "min_rating",
    "sort", "in_stock",
]
SearchStateOperation = Literal["merge", "replace", "remove", "reset"]


class SearchStateCommand(BaseModel):
    """Validated command consumed by the deterministic state manager."""

    model_config = ConfigDict(extra="forbid")

    operation: SearchStateOperation
    filters: SearchStatePatch | None = None
    remove: list[FilterName] = Field(default_factory=list, max_length=14)

    @model_validator(mode="after")
    def validate_operation_payload(self) -> SearchStateCommand:
        if self.operation in {"merge", "replace"}:
            if self.filters is None or not self.filters.model_fields_set:
                raise ValueError(f"{self.operation} requires at least one filter")
            if any(value is None for value in self.filters.model_dump(exclude_unset=True).values()):
                raise ValueError("Use remove to clear filters; merge and replace do not accept null values")
        elif self.operation == "remove" and not self.remove:
            raise ValueError("remove requires at least one filter name")
        elif self.operation == "reset" and (self.filters is not None or self.remove):
            raise ValueError("reset does not accept filters or remove")
        return self


class SearchStateTransition(BaseModel):
    """Result of a state command, including whether the prior state is archived."""

    state: SearchState
    archive_previous: bool = False

"""Compile typed shopping filters into safe, efficient MongoDB query documents."""

from __future__ import annotations

import re

from copilot.models.product_query import (
    BooleanMode,
    CompiledMongoQuery,
    IndexSuggestion,
    NumericRange,
    ProductQueryRequest,
    QueryComplexity,
    SafeRegex,
    SpecFilter,
)


class MongoQueryBuilder:
    """Transforms validated models only; raw client dictionaries are never compiled."""

    def build(self, request: ProductQueryRequest) -> CompiledMongoQuery:
        clauses = self._build_clauses(request)
        query_filter = self._combine_clauses(clauses, request.mode)
        sort = [(request.sort_by.value, 1 if request.sort_direction.value == "asc" else -1)]
        skip = (request.page - 1) * request.page_size
        suggestions = self._suggest_indexes(request, sort)
        complexity = self._estimate_complexity(request, clauses)

        if request.include_total:
            pipeline: list[dict[str, object]] = [
                {"$match": query_filter},
                {
                    "$facet": {
                        "items": [{"$sort": dict(sort)}, {"$skip": skip}, {"$limit": request.page_size}],
                        "metadata": [{"$count": "total"}],
                    },
                },
            ]
            return CompiledMongoQuery(
                strategy="aggregate",
                sort=sort,
                skip=skip,
                limit=request.page_size,
                pipeline=pipeline,
                index_suggestions=suggestions,
                complexity=complexity,
            )

        return CompiledMongoQuery(
            strategy="find",
            filter=query_filter,
            sort=sort,
            skip=skip,
            limit=request.page_size,
            index_suggestions=suggestions,
            complexity=complexity,
        )

    def _build_clauses(self, request: ProductQueryRequest) -> list[dict[str, object]]:
        clauses: list[dict[str, object]] = []
        if request.categories:
            clauses.append({"category": {"$in": request.categories}})
        if request.brands:
            clauses.append({"brand": {"$in": request.brands}})
        if request.brand_regex:
            clauses.append({"brand": self._compile_regex(request.brand_regex)})
        if request.price:
            clauses.append({"price": self._compile_range(request.price)})
        clauses.extend(self._compile_spec_filter(spec_filter) for spec_filter in request.specs)
        return clauses

    @staticmethod
    def _combine_clauses(clauses: list[dict[str, object]], mode: BooleanMode) -> dict[str, object]:
        if not clauses:
            return {}
        if len(clauses) == 1:
            return clauses[0]
        return {"$and" if mode == BooleanMode.AND else "$or": clauses}

    @staticmethod
    def _compile_range(value: NumericRange) -> dict[str, float]:
        query: dict[str, float] = {}
        if value.minimum is not None:
            query["$gte"] = value.minimum
        if value.maximum is not None:
            query["$lte"] = value.maximum
        return query

    @staticmethod
    def _compile_regex(value: SafeRegex) -> dict[str, str]:
        escaped = re.escape(value.value)
        if value.mode == "prefix":
            pattern = f"^{escaped}"
        elif value.mode == "exact":
            pattern = f"^{escaped}$"
        else:
            pattern = escaped
        return {"$regex": pattern, "$options": "i"}

    def _compile_spec_filter(self, spec_filter: SpecFilter) -> dict[str, object]:
        field = f"specs.{spec_filter.field}"
        if spec_filter.equals is not None:
            return {field: spec_filter.equals}
        if spec_filter.range is not None:
            return {field: self._compile_range(spec_filter.range)}
        if spec_filter.regex is not None:
            return {field: self._compile_regex(spec_filter.regex)}
        raise ValueError("SpecFilter validation should ensure an operator exists")

    @staticmethod
    def _suggest_indexes(request: ProductQueryRequest, sort: list[tuple[str, int]]) -> list[IndexSuggestion]:
        suggestions: list[IndexSuggestion] = []
        prefix: list[tuple[str, int]] = []
        if request.categories:
            prefix.append(("category", 1))
        if request.brands:
            prefix.append(("brand", 1))
        if request.price:
            prefix.append(("price", 1))
        if prefix:
            suggestions.append(IndexSuggestion(fields=prefix + sort, reason="Supports common equality/range filters and result ordering."))
        for spec_filter in request.specs:
            if spec_filter.regex is None or spec_filter.regex.mode != "contains":
                suggestions.append(IndexSuggestion(fields=[(f"specs.{spec_filter.field}", 1)], reason="Supports the nested spec predicate."))
        if not suggestions:
            suggestions.append(IndexSuggestion(fields=sort, reason="Supports the default sorted product listing."))
        return suggestions

    @staticmethod
    def _estimate_complexity(request: ProductQueryRequest, clauses: list[dict[str, object]]) -> QueryComplexity:
        reasons: list[str] = []
        high_cost_regex = any(
            spec.regex is not None and spec.regex.mode == "contains" for spec in request.specs
        ) or (request.brand_regex is not None and request.brand_regex.mode == "contains")
        if high_cost_regex:
            reasons.append("Contains regex may scan many index keys/documents; prefer exact or prefix matches.")
        if request.mode == BooleanMode.OR and len(clauses) > 1:
            reasons.append("OR predicates can require multiple index scans and result unioning.")
        if request.include_total:
            reasons.append("Facet total counting reads all matched documents before returning the page.")
        if high_cost_regex:
            level = "high"
        elif len(clauses) > 3 or request.include_total or request.mode == BooleanMode.OR:
            level = "medium"
        else:
            level = "low"
        estimated_cost = {
            "low": "O(log N + page_size) with a matching compound index.",
            "medium": "Approximately O(matched documents) for count/union work, plus page retrieval.",
            "high": "Potentially O(N) due to unanchored regex evaluation.",
        }[level]
        return QueryComplexity(level=level, estimated_cost=estimated_cost, reasons=reasons or ["Use the suggested index for indexed filter and sort execution."])

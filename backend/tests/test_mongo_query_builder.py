"""Tests for safe MongoDB query and aggregation-pipeline compilation."""

from __future__ import annotations

import unittest

from pydantic import ValidationError

from copilot.models.product_query import (
    BooleanMode,
    NumericRange,
    ProductQueryRequest,
    SafeRegex,
    SpecFilter,
)
from copilot.service.mongo_query_builder import MongoQueryBuilder


class MongoQueryBuilderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.builder = MongoQueryBuilder()

    def test_compiles_and_query_with_range_brand_category_and_nested_specs(self) -> None:
        query = self.builder.build(ProductQueryRequest(
            categories=["phones"],
            brands=["Samsung"],
            price=NumericRange(minimum=20_000, maximum=40_000),
            specs=[SpecFilter(field="display", equals="AMOLED")],
            sort_by="price",
            sort_direction="asc",
            page=2,
            page_size=10,
        ))

        self.assertEqual(query.strategy, "find")
        self.assertEqual(query.filter["$and"][0], {"category": {"$in": ["phones"]}})
        self.assertIn({"specs.display": "AMOLED"}, query.filter["$and"])
        self.assertEqual(query.sort, [("price", 1)])
        self.assertEqual(query.skip, 10)

    def test_compiles_or_query(self) -> None:
        query = self.builder.build(ProductQueryRequest(
            categories=["phones"], brands=["OnePlus"], mode=BooleanMode.OR,
        ))

        self.assertIn("$or", query.filter)
        self.assertEqual(len(query.filter["$or"]), 2)

    def test_escapes_regex_text(self) -> None:
        query = self.builder.build(ProductQueryRequest(brand_regex=SafeRegex(value="OnePlus.*", mode="prefix")))

        self.assertEqual(query.filter, {"brand": {"$regex": "^OnePlus\\.\\*", "$options": "i"}})
        self.assertEqual(query.complexity.level, "low")

    def test_generates_facet_pipeline_when_total_is_requested(self) -> None:
        query = self.builder.build(ProductQueryRequest(
            price=NumericRange(maximum=40_000), include_total=True, page=3, page_size=25,
        ))

        self.assertEqual(query.strategy, "aggregate")
        self.assertEqual(query.pipeline[0], {"$match": {"price": {"$lte": 40_000.0}}})
        self.assertEqual(query.pipeline[1]["$facet"]["items"][1], {"$skip": 50})
        self.assertEqual(query.complexity.level, "medium")

    def test_contains_regex_is_flagged_high_complexity(self) -> None:
        query = self.builder.build(ProductQueryRequest(
            specs=[SpecFilter(field="chipset", regex=SafeRegex(value="snapdragon", mode="contains"))],
        ))

        self.assertEqual(query.complexity.level, "high")
        self.assertTrue(any("regex" in reason.lower() for reason in query.complexity.reasons))

    def test_rejects_unsafe_spec_field_and_raw_operators(self) -> None:
        with self.assertRaises(ValidationError):
            SpecFilter(field="display.$where", equals="AMOLED")
        with self.assertRaises(ValidationError):
            ProductQueryRequest.model_validate({"price": {"$gt": 10}})


if __name__ == "__main__":
    unittest.main()

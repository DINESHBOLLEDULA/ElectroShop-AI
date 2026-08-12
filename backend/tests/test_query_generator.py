"""Unit tests proving query plans are strict, validated intermediates."""

from __future__ import annotations

import unittest

from copilot.models.intent import IntentClassification
from copilot.models.query_plan import QueryGenerationContext, RecentMessage
from copilot.models.search_state import SearchState
from copilot.service.query_generator import QueryGenerationError, QueryGenerator


class FakeQueryClient:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.responses.pop(0)


def build_context(intent: str = "MODIFY") -> QueryGenerationContext:
    return QueryGenerationContext(
        intent=IntentClassification(intent=intent, confidence=0.95),
        current_filters=SearchState(category="phones", brand="Samsung"),
        recent_messages=[RecentMessage(role="user", content="Below 40000")],
    )


class QueryGeneratorTests(unittest.TestCase):
    def test_returns_validated_database_agnostic_plan(self) -> None:
        client = FakeQueryClient([
            '{"intent":"MODIFY","operation":"merge","max_price":40000,"remove_filters":[]}',
        ])
        plan = QueryGenerator(client, sleeper=lambda _: None).generate(build_context())

        self.assertEqual(plan.max_price, 40000)
        self.assertEqual(plan.operation, "merge")
        self.assertNotIn("$match", client.prompts[0])
        self.assertIn("JSON Schema:", client.prompts[0])

    def test_rejects_mongodb_syntax_and_unknown_fields(self) -> None:
        client = FakeQueryClient([
            '{"intent":"MODIFY","operation":"merge","max_price":40000,"$match":{}}',
        ])
        with self.assertRaises(QueryGenerationError):
            QueryGenerator(client, max_attempts=1, sleeper=lambda _: None).generate(build_context())

    def test_rejects_intent_mismatch(self) -> None:
        client = FakeQueryClient([
            '{"intent":"NEW_SEARCH","operation":"replace","category":"phones","remove_filters":[]}',
        ])
        with self.assertRaises(QueryGenerationError):
            QueryGenerator(client, max_attempts=1, sleeper=lambda _: None).generate(build_context())

    def test_remove_plan_accepts_only_named_filters(self) -> None:
        client = FakeQueryClient([
            '{"intent":"REMOVE_FILTER","operation":"remove","remove_filters":["display"]}',
        ])
        context = build_context("REMOVE_FILTER")
        plan = QueryGenerator(client, sleeper=lambda _: None).generate(context)

        self.assertEqual(plan.remove_filters, ["display"])


if __name__ == "__main__":
    unittest.main()

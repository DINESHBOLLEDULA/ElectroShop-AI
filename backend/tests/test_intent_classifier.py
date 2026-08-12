"""Unit tests for LLM-output validation, retries, and deterministic fallback."""

from __future__ import annotations

import unittest

from copilot.models.intent import Intent
from copilot.service.intent_classifier import IntentClassifier


class FakeIntentClient:
    def __init__(self, responses: list[str | Exception]) -> None:
        self.responses = responses
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class IntentClassifierTests(unittest.TestCase):
    def test_valid_structured_output_is_returned(self) -> None:
        client = FakeIntentClient(['{"intent":"COMPARE","confidence":0.94,"clarification_question":null}'])
        result = IntentClassifier(client, sleeper=lambda _: None).classify("Compare two phones")

        self.assertEqual(result.intent, Intent.COMPARE)
        self.assertFalse(result.fallback_used)
        self.assertIn("<user_message>Compare two phones</user_message>", client.prompts[0])

    def test_malformed_json_retries_then_accepts_valid_output(self) -> None:
        client = FakeIntentClient([
            "not json",
            '{"intent":"MODIFY","confidence":0.91,"clarification_question":null}',
        ])
        result = IntentClassifier(client, sleeper=lambda _: None).classify("Below 40000")

        self.assertEqual(result.intent, Intent.MODIFY)
        self.assertEqual(len(client.prompts), 2)

    def test_schema_violation_falls_back_after_retries(self) -> None:
        client = FakeIntentClient(['{"intent":"HACK","confidence":1.0,"clarification_question":null}'] * 3)
        result = IntentClassifier(client, sleeper=lambda _: None).classify("Remove AMOLED")

        self.assertEqual(result.intent, Intent.REMOVE_FILTER)
        self.assertTrue(result.fallback_used)
        self.assertEqual(len(client.prompts), 3)

    def test_low_confidence_output_falls_back(self) -> None:
        client = FakeIntentClient(['{"intent":"NEW_SEARCH","confidence":0.2,"clarification_question":null}'] * 3)
        result = IntentClassifier(client, sleeper=lambda _: None).classify("Find phones")

        self.assertEqual(result.intent, Intent.NEW_SEARCH)
        self.assertTrue(result.fallback_used)

    def test_clarify_output_requires_a_question(self) -> None:
        client = FakeIntentClient(['{"intent":"CLARIFY","confidence":0.9,"clarification_question":null}'] * 3)
        result = IntentClassifier(client, sleeper=lambda _: None).classify("Help")

        self.assertEqual(result.intent, Intent.CLARIFY)
        self.assertTrue(result.fallback_used)
        self.assertIsNotNone(result.clarification_question)


if __name__ == "__main__":
    unittest.main()

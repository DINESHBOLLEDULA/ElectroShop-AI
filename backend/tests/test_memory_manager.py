"""Unit tests for summary cadence and token-bounded conversation memory."""

from __future__ import annotations

import unittest

from copilot.models.conversation import Conversation, Message
from copilot.models.search_state import SearchState
from copilot.service.memory_manager import MemoryManager, SUMMARY_INTERVAL_MESSAGES


class FakeSummarizer:
    def __init__(self) -> None:
        self.calls: list[list[Message]] = []

    def summarize(self, existing_summary, messages):
        self.calls.append(messages)
        return "User wants a gaming phone with a strong display."


class MemoryManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.summarizer = FakeSummarizer()
        self.manager = MemoryManager(self.summarizer)

    def test_compacts_exactly_every_fifteen_messages(self) -> None:
        conversation = Conversation(messages=[Message(role="user", content=f"message {index}") for index in range(SUMMARY_INTERVAL_MESSAGES)])

        checkpoint = self.manager.summarize_next_batch(conversation)

        self.assertIsNotNone(checkpoint)
        summary, summarized_count = checkpoint
        self.assertEqual(summary, "User wants a gaming phone with a strong display.")
        self.assertEqual(summarized_count, 15)
        self.assertEqual(len(self.summarizer.calls[0]), 15)

    def test_context_never_exceeds_token_budget(self) -> None:
        conversation = Conversation(
            summary="A" * 500,
            summary_message_count=15,
            messages=[Message(role="user", content="recent request " * 30) for _ in range(20)],
            active_search=SearchState(category="phones", brand="Samsung"),
            retrieved_products=list(range(100)),
            memory_version=7,
        )

        context = self.manager.build_context(conversation, token_budget=300)

        self.assertLessEqual(context.estimated_tokens, 300)
        self.assertEqual(context.memory_version, 7)
        self.assertLessEqual(len(context.retrieved_products), 30)
        self.assertLess(len(context.recent_messages), 5)

    def test_no_compaction_before_interval(self) -> None:
        conversation = Conversation(messages=[Message(role="user", content="hello") for _ in range(14)])

        self.assertIsNone(self.manager.summarize_next_batch(conversation))

    def test_too_small_budget_for_search_state_is_rejected(self) -> None:
        conversation = Conversation(active_search=SearchState(
            category="phones", brand="Samsung", display="AMOLED", chipset="Snapdragon 8 Elite",
        ))

        with self.assertRaises(ValueError):
            self.manager.build_context(conversation, token_budget=1)


if __name__ == "__main__":
    unittest.main()

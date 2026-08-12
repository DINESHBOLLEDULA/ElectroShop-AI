"""Unit tests for deterministic conversational search-state transitions."""

from __future__ import annotations

import unittest

from pydantic import ValidationError

from copilot.models.search_state import SearchState, SearchStateCommand, SearchStatePatch
from copilot.service.search_state_manager import SearchStateManager


class SearchStateManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manager = SearchStateManager()

    def test_refinement_sequence_does_not_use_chat_history(self) -> None:
        state = None
        state = self.manager.apply(
            state,
            SearchStateCommand(operation="merge", filters=SearchStatePatch(category="phones", brand="Samsung")),
        ).state
        state = self.manager.apply(
            state,
            SearchStateCommand(operation="merge", filters=SearchStatePatch(max_price=40_000)),
        ).state
        state = self.manager.apply(
            state,
            SearchStateCommand(operation="merge", filters=SearchStatePatch(display="AMOLED")),
        ).state
        state = self.manager.apply(
            state,
            SearchStateCommand(operation="merge", filters=SearchStatePatch(brand="OnePlus")),
        ).state
        state = self.manager.apply(state, SearchStateCommand(operation="remove", remove=["display"])).state

        self.assertEqual(state.category, "phones")
        self.assertEqual(state.brand, "OnePlus")
        self.assertEqual(state.max_price, 40_000)
        self.assertIsNone(state.display)

    def test_replace_archives_a_non_empty_previous_state(self) -> None:
        current = SearchState(category="phones", brand="Samsung")
        transition = self.manager.apply(
            current,
            SearchStateCommand(operation="replace", filters=SearchStatePatch(category="laptops")),
        )

        self.assertTrue(transition.archive_previous)
        self.assertEqual(transition.state.category, "laptops")
        self.assertIsNone(transition.state.brand)

    def test_reset_clears_filters_and_archives_previous_state(self) -> None:
        transition = self.manager.apply(
            SearchState(category="phones", display="AMOLED"),
            SearchStateCommand(operation="reset"),
        )

        self.assertTrue(transition.archive_previous)
        self.assertFalse(transition.state.has_filters())

    def test_merge_rejects_an_invalid_price_range(self) -> None:
        with self.assertRaises(ValidationError):
            self.manager.apply(
                SearchState(min_price=50_000),
                SearchStateCommand(operation="merge", filters=SearchStatePatch(max_price=40_000)),
            )

    def test_null_filter_values_are_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            SearchStateCommand.model_validate(
                {"operation": "merge", "filters": {"display": None}},
            )


if __name__ == "__main__":
    unittest.main()

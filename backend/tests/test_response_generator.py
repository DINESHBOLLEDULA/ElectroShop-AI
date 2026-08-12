"""Tests that response rendering is grounded exclusively in retrieved catalog facts."""

from __future__ import annotations

import unittest

from copilot.models.response import ResponseGenerationRequest
from copilot.models.retrieval import ProductCandidate
from copilot.service.response_generator import GroundedResponseGenerator, ResponsePlanner


class FakePlannerClient:
    def __init__(self, response: str) -> None:
        self.response = response

    def generate(self, prompt: str) -> str:
        return self.response


def request() -> ResponseGenerationRequest:
    return ResponseGenerationRequest(
        question="Which is better for travel?",
        products=[
            ProductCandidate(id="a", name="Travel Pro", price=999, rating=4.7, in_stock=True, specs={"weight": "1.1kg", "battery": "15 hours"}),
            ProductCandidate(id="b", name="Travel Lite", price=799, rating=4.5, in_stock=True, specs={"weight": "0.9kg"}),
        ],
    )


class ResponseGeneratorTests(unittest.TestCase):
    def test_renders_verified_recommendations_pros_cons_and_comparison(self) -> None:
        client = FakePlannerClient('''{
          "recommendation_ids":["a"], "alternative_ids":["b"], "comparison_ids":["a","b"],
          "comparison_fields":["price","specs.weight","specs.battery"],
          "pros":[{"product_id":"a","field":"specs.weight"}],
          "cons":[{"product_id":"a","field":"price"}]
        }''')
        result = GroundedResponseGenerator(ResponsePlanner(client)).generate(request())

        self.assertFalse(result.fallback_used)
        self.assertIn("## Recommendations", result.answer)
        self.assertIn("Travel Pro", result.answer)
        self.assertIn("1.1kg", result.answer)
        self.assertIn("## Comparison", result.answer)
        self.assertIn("## Alternatives", result.answer)
        self.assertIn("I couldn't find this information.", result.answer)

    def test_hallucinated_product_reference_is_rejected_and_falls_back(self) -> None:
        client = FakePlannerClient('{"recommendation_ids":["not-retrieved"],"alternative_ids":[],"comparison_ids":[],"comparison_fields":[],"pros":[],"cons":[]}')
        result = GroundedResponseGenerator(ResponsePlanner(client, max_attempts=1)).generate(request())

        self.assertTrue(result.fallback_used)
        self.assertEqual(result.plan.recommendation_ids, ["a"])
        self.assertNotIn("not-retrieved", result.answer)

    def test_unavailable_evidence_field_is_rejected_and_never_rendered(self) -> None:
        client = FakePlannerClient('{"recommendation_ids":["a"],"alternative_ids":[],"comparison_ids":[],"comparison_fields":[],"pros":[{"product_id":"a","field":"specs.gpu"}],"cons":[]}')
        result = GroundedResponseGenerator(ResponsePlanner(client, max_attempts=1)).generate(request())

        self.assertTrue(result.fallback_used)
        self.assertNotIn("Gpu", result.answer)


if __name__ == "__main__":
    unittest.main()

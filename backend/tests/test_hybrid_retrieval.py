"""Unit tests for semantic retrieval, deterministic ranking, and metadata fallback."""

from __future__ import annotations

import unittest

from copilot.models.retrieval import HybridSearchRequest, ProductCandidate
from copilot.service.hybrid_retrieval import HybridRetriever, SemanticQueryExpander


class FakeLlm:
    def __init__(self, response: str) -> None:
        self.response = response
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.response


class FakeEmbeddingClient:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.inputs: list[str] = []

    def embed(self, text: str) -> list[float]:
        self.inputs.append(text)
        if self.fail:
            raise RuntimeError("embedding unavailable")
        return [0.1, 0.2]


class FakeProductStore:
    def __init__(self, vector_products: list[ProductCandidate], metadata_products: list[ProductCandidate]) -> None:
        self.vector_products = vector_products
        self.metadata_products = metadata_products
        self.vector_calls = 0
        self.metadata_calls = 0

    async def vector_search(self, embedding, filters, limit):
        self.vector_calls += 1
        return self.vector_products[:limit]

    async def metadata_search(self, filters, limit):
        self.metadata_calls += 1
        return self.metadata_products[:limit]


class HybridRetrievalTests(unittest.IsolatedAsyncioTestCase):
    async def test_semantic_retrieval_expands_embeds_and_ranks_top_candidates(self) -> None:
        llm = FakeLlm('{"text":"high performance gaming smartphone"}')
        embeddings = FakeEmbeddingClient()
        store = FakeProductStore(
            [
                ProductCandidate(id="1", name="A", rating=4.2, reviews=10, in_stock=True, semantic_score=0.99),
                ProductCandidate(id="2", name="B", rating=5.0, reviews=5000, in_stock=True, semantic_score=0.80),
            ],
            [],
        )
        result = await HybridRetriever(SemanticQueryExpander(llm), embeddings, store).retrieve(HybridSearchRequest(query="Good gaming phone"))

        self.assertEqual(result.strategy, "semantic")
        self.assertEqual(embeddings.inputs, ["high performance gaming smartphone"])
        self.assertEqual(store.vector_calls, 1)
        self.assertEqual(store.metadata_calls, 0)
        self.assertEqual(result.products[0].id, "1")

    async def test_embedding_failure_uses_metadata_fallback(self) -> None:
        store = FakeProductStore([], [ProductCandidate(id="3", name="Fallback", rating=4.5, in_stock=True)])
        result = await HybridRetriever(
            SemanticQueryExpander(FakeLlm('{"text":"travel laptop"}')),
            FakeEmbeddingClient(fail=True),
            store,
        ).retrieve(HybridSearchRequest(query="Travel laptop"))

        self.assertEqual(result.strategy, "metadata_fallback")
        self.assertEqual(result.products[0].id, "3")
        self.assertEqual(store.vector_calls, 0)
        self.assertEqual(store.metadata_calls, 1)

    async def test_empty_vector_results_use_metadata_fallback(self) -> None:
        store = FakeProductStore([], [ProductCandidate(id="4", name="Metadata", rating=4.0)])
        result = await HybridRetriever(
            SemanticQueryExpander(FakeLlm('{"text":"thin laptop"}')),
            FakeEmbeddingClient(),
            store,
        ).retrieve(HybridSearchRequest(query="Thin laptop"))

        self.assertEqual(result.strategy, "metadata_fallback")
        self.assertEqual(store.vector_calls, 1)
        self.assertEqual(store.metadata_calls, 1)

    def test_invalid_expansion_output_uses_original_query(self) -> None:
        semantic = SemanticQueryExpander(FakeLlm("not json")).expand("Best camera")

        self.assertEqual(semantic.text, "Best camera")
        self.assertTrue(semantic.fallback_used)


if __name__ == "__main__":
    unittest.main()

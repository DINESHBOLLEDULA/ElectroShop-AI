"""MongoDB Atlas Vector Search adapter for a product collection."""

from __future__ import annotations

from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from copilot.models.product_query import ProductQueryRequest
from copilot.models.retrieval import ProductCandidate
from copilot.service.mongo_query_builder import MongoQueryBuilder


class AtlasVectorProductRepository:
    """Runs Atlas vector retrieval before validated metadata filters and deterministic ranking."""

    def __init__(self, database: AsyncIOMotorDatabase, collection_name: str = "products") -> None:
        self._collection = database[collection_name]
        self._query_builder = MongoQueryBuilder()

    async def vector_search(self, embedding: list[float], filters: ProductQueryRequest, limit: int) -> list[ProductCandidate]:
        compiled = self._query_builder.build(filters.model_copy(update={"include_total": False, "page": 1, "page_size": limit}))
        pipeline: list[dict[str, Any]] = [
            {
                "$vectorSearch": {
                    "index": "product_vector_index",
                    "path": "embedding",
                    "queryVector": embedding,
                    "numCandidates": max(limit * 10, 100),
                    "limit": limit,
                },
            },
            {"$match": compiled.filter or {}},
            {"$set": {"semantic_score": {"$meta": "vectorSearchScore"}}},
            {"$limit": limit},
        ]
        return [self._to_candidate(document) async for document in self._collection.aggregate(pipeline)]

    async def metadata_search(self, filters: ProductQueryRequest, limit: int) -> list[ProductCandidate]:
        compiled = self._query_builder.build(filters.model_copy(update={"include_total": False, "page": 1, "page_size": limit}))
        cursor = self._collection.find(compiled.filter or {}).sort(compiled.sort).limit(limit)
        return [self._to_candidate(document) async for document in cursor]

    @staticmethod
    def _to_candidate(document: dict[str, Any]) -> ProductCandidate:
        raw_id = document.get("_id")
        product_id = str(raw_id) if isinstance(raw_id, ObjectId) else str(raw_id)
        return ProductCandidate(
            id=product_id,
            name=str(document.get("name", "")),
            brand=document.get("brand"),
            category=document.get("category"),
            price=document.get("price"),
            rating=document.get("rating"),
            reviews=document.get("reviews", 0),
            in_stock=document.get("in_stock"),
            specs=document.get("specs") or {},
            semantic_score=document.get("semantic_score"),
        )

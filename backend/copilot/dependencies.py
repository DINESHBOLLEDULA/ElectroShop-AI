"""
Dependency injection for the Copilot module.

=== WHY DEPENDENCY INJECTION? ===

FastAPI's `Depends()` system provides constructor injection for route
handlers. This gives us three benefits:

1. COMPOSITION ROOT — all object creation happens here, not scattered
   across the codebase. If we need to swap the repository (e.g., for
   testing), we override this one function.

2. SINGLE RESPONSIBILITY — route handlers don't create their own
   dependencies. They declare what they need, and the DI system provides it.

3. TESTABILITY — in tests, we can replace get_conversation_service()
   with a mock factory using app.dependency_overrides.

=== WHY NOT A DI FRAMEWORK (e.g., python-inject, dependency-injector)? ===

FastAPI's built-in Depends() is sufficient for our scale. External DI
frameworks add complexity and learning curve for minimal benefit when
the dependency graph is shallow (DB → Repository → Service).
"""

from fastapi import HTTPException, status

from copilot.database.mongodb import MongoDB
from copilot.repository.conversation_repository import ConversationRepository
from copilot.service.conversation_service import ConversationService
from copilot.service.intent_classifier import GeminiIntentModelClient, IntentClassifier
from copilot.service.query_generator import QueryGenerator
from copilot.service.mongo_query_builder import MongoQueryBuilder
from copilot.service.hybrid_retrieval import GeminiEmbeddingClient, HybridRetriever, SemanticQueryExpander
from copilot.repository.atlas_vector_product_repository import AtlasVectorProductRepository
from copilot.service.memory_manager import GeminiConversationSummarizer, MemoryManager
from copilot.service.response_generator import GroundedResponseGenerator, ResponsePlanner


def get_intent_classifier() -> IntentClassifier:
    """Provide a stateless classifier whose failures fall back safely."""
    return IntentClassifier(GeminiIntentModelClient())


def get_query_generator() -> QueryGenerator:
    """Provide a stateless generator that returns plans, never database queries."""
    return QueryGenerator(GeminiIntentModelClient())


def get_mongo_query_builder() -> MongoQueryBuilder:
    """Query compilation is pure and stateless, so no database connection is needed."""
    return MongoQueryBuilder()


def get_hybrid_retriever() -> HybridRetriever:
    """Compose Atlas vector retrieval with a deterministic metadata fallback."""
    try:
        database = MongoDB.get_database()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hybrid retrieval is temporarily unavailable",
        ) from exc
    return HybridRetriever(
        SemanticQueryExpander(GeminiIntentModelClient()),
        GeminiEmbeddingClient(),
        AtlasVectorProductRepository(database),
    )


def get_memory_manager() -> MemoryManager:
    """Provide rolling-summary memory backed by the same JSON-capable LLM adapter."""
    return MemoryManager(GeminiConversationSummarizer(GeminiIntentModelClient()))


def get_response_generator() -> GroundedResponseGenerator:
    """Return a grounded generator that never renders raw LLM claims."""
    return GroundedResponseGenerator(ResponsePlanner(GeminiIntentModelClient()))


def get_conversation_service() -> ConversationService:
    """
    Factory function for ConversationService.

    Called once per request by FastAPI's dependency injection system.

    WHY create new instances per request?
        The Service and Repository are lightweight objects (no state, no
        connection pools). Creating them per-request is ~0.001ms and
        ensures each request gets a clean instance. The heavy resource
        (MongoDB connection pool) is managed by the MongoDB singleton
        and shared across all requests.

    WHY not cache/singleton the service?
        Singletons in web apps introduce thread-safety concerns.
        Per-request instances are simpler and equally performant because
        the only "expensive" resource (the DB connection) is already shared.
    """
    try:
        db = MongoDB.get_database()
    except RuntimeError as exc:
        # MongoDB is an optional extension to the existing product backend.
        # Return a precise, retryable response instead of leaking a 500.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Conversation service is temporarily unavailable",
        ) from exc
    repository = ConversationRepository(db)
    return ConversationService(
        repository,
        intent_classifier=get_intent_classifier(),
        query_generator=get_query_generator(),
        memory_manager=get_memory_manager(),
    )

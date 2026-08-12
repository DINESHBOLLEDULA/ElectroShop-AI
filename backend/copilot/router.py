"""
FastAPI router for Conversation Management APIs.

=== WHY A SEPARATE ROUTER? ===

FastAPI's APIRouter allows modular route registration. Instead of adding
all endpoints to the main `app` object (which would bloat main.py),
we define routes in a dedicated router and mount it in main.py with:

    app.include_router(copilot_router)

This follows the "plugin" pattern — the copilot module is self-contained.
Removing it is as simple as removing the include_router() call. No changes
to existing endpoints.

=== URL STRUCTURE ===

All copilot endpoints live under /v2/copilot/:

    POST   /v2/copilot/conversations                      Create chat
    GET    /v2/copilot/conversations                      List chats
    GET    /v2/copilot/conversations/{conversation_id}    Load history
    PATCH  /v2/copilot/conversations/{conversation_id}    Rename chat
    DELETE /v2/copilot/conversations/{conversation_id}    Delete chat
    POST   /v2/copilot/conversations/{id}/messages        Save message
    PUT    /v2/copilot/conversations/{id}/summary         Update summary

WHY /v2/?
    The existing /copilot/chat endpoint continues to work unchanged.
    When the new system is validated, the frontend switches to v2.
    This is the "expand and contract" migration strategy.

WHY PATCH for rename (not PUT)?
    PATCH = partial update (only the title changes).
    PUT = full replacement (the entire resource is overwritten).
    Renaming changes one field. PATCH is semantically correct.

WHY PUT for summary (not PATCH)?
    The summary endpoint replaces the entire summary string.
    It's a full replacement of that specific sub-resource.
    PUT is semantically correct for full replacement.

=== ERROR HANDLING ===

Domain exceptions (ConversationNotFoundError, InvalidConversationError)
are caught in each route handler and mapped to HTTPException with the
appropriate status code. This approach works with APIRouter (unlike
app.exception_handler which requires the FastAPI app instance).
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from copilot.dependencies import get_conversation_service, get_hybrid_retriever, get_intent_classifier, get_mongo_query_builder, get_response_generator
from copilot.exceptions import ConversationNotFoundError, InvalidConversationError
from copilot.models.conversation import (
    ConversationDetail,
    ConversationListItem,
    CreateConversationRequest,
    MessageResponse,
    RenameConversationRequest,
    SaveMessageRequest,
    UpdateSummaryRequest,
)
from copilot.models.search_state import SearchState, SearchStateCommand
from copilot.models.intent import ClassifyIntentRequest, IntentClassification
from copilot.models.query_plan import GenerateQueryPlanRequest, QueryPlan
from copilot.models.product_query import CompiledMongoQuery, ProductQueryRequest
from copilot.models.retrieval import HybridRetrievalResult, HybridSearchRequest
from copilot.models.memory import DeviceSyncRequest, DeviceSyncResponse, MemoryContext
from copilot.models.response import GeneratedResponse, ResponseGenerationRequest
from copilot.service.intent_classifier import IntentClassifier
from copilot.service.query_generator import QueryGenerationError
from copilot.service.mongo_query_builder import MongoQueryBuilder
from copilot.service.hybrid_retrieval import HybridRetriever
from copilot.service.response_generator import GroundedResponseGenerator
from copilot.service.conversation_service import ConversationService

logger = logging.getLogger("copilot.router")

router = APIRouter(
    prefix="/v2/copilot",
    tags=["Copilot V2 — Conversations"],
)


# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════


@router.post(
    "/conversations",
    response_model=ConversationDetail,
    status_code=201,
    summary="Create a new conversation",
    description=(
        "Creates an empty conversation. If no title is provided, it defaults "
        "to 'New Chat' and will be auto-titled from the first user message."
    ),
)
async def create_conversation(
    body: CreateConversationRequest,
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationDetail:
    try:
        return await service.create_conversation(
            user_id=body.user_id,
            title=body.title,
        )
    except InvalidConversationError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)


@router.get(
    "/conversations",
    response_model=list[ConversationListItem],
    summary="List conversations",
    description=(
        "Returns conversations for a user, sorted by most recently updated. "
        "Each item is lightweight — includes title, timestamps, message count, "
        "and a preview of the last message. Does NOT include full message history."
    ),
)
async def list_conversations(
    user_id: str = Query(
        default="default",
        min_length=1,
        max_length=128,
        description="User ID to filter by",
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Max results"),
    skip: int = Query(default=0, ge=0, description="Offset for pagination"),
    service: ConversationService = Depends(get_conversation_service),
) -> list[ConversationListItem]:
    return await service.list_conversations(
        user_id=user_id,
        limit=limit,
        skip=skip,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Get conversation with full history",
    description=(
        "Loads a conversation including all messages, search state, summary, "
        "and retrieved products. Used when opening a chat in the UI."
    ),
)
async def get_conversation(
    conversation_id: str,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationDetail:
    try:
        return await service.get_conversation(conversation_id, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Rename a conversation",
    description="Updates the title of an existing conversation.",
)
async def rename_conversation(
    conversation_id: str,
    body: RenameConversationRequest,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationDetail:
    try:
        return await service.rename_conversation(conversation_id, body.title, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except InvalidConversationError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=204,
    summary="Delete a conversation",
    description="Permanently deletes a conversation and all its messages.",
)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> None:
    try:
        await service.delete_conversation(conversation_id, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
    summary="Save a message",
    description=(
        "Appends a message to the conversation. If this is the first user "
        "message and the conversation has no custom title, the title is "
        "automatically set from the message content (first 100 characters)."
    ),
)
async def save_message(
    conversation_id: str,
    body: SaveMessageRequest,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> MessageResponse:
    try:
        return await service.save_message(
            conversation_id=conversation_id,
            role=body.role,
            content=body.content,
            metadata=body.metadata,
            user_id=user_id,
        )
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except InvalidConversationError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)


@router.put(
    "/conversations/{conversation_id}/summary",
    response_model=ConversationDetail,
    summary="Update conversation summary",
    description=(
        "Sets or replaces the conversation summary. Summaries are typically "
        "generated by the Memory Manager after a conversation reaches a "
        "certain number of turns."
    ),
)
async def update_summary(
    conversation_id: str,
    body: UpdateSummaryRequest,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationDetail:
    try:
        return await service.update_summary(conversation_id, body.summary, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except InvalidConversationError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)


@router.put(
    "/conversations/{conversation_id}/search-state",
    response_model=SearchState,
    summary="Apply a structured search-state command",
    description=(
        "Merges, replaces, removes, or resets typed product filters. The "
        "operation uses the persisted active search state and never parses "
        "or replays raw chat history."
    ),
)
async def update_search_state(
    conversation_id: str,
    body: SearchStateCommand,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> SearchState:
    try:
        return await service.update_search_state(conversation_id, body, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")


@router.post(
    "/intents/classify",
    response_model=IntentClassification,
    summary="Classify a user message",
    description="Returns validated routing intent only. It does not execute search or change search state.",
)
async def classify_intent(
    body: ClassifyIntentRequest,
    classifier: IntentClassifier = Depends(get_intent_classifier),
) -> IntentClassification:
    return await asyncio.to_thread(classifier.classify, body.message)


@router.post(
    "/conversations/{conversation_id}/query-plan",
    response_model=QueryPlan,
    summary="Generate a validated intermediate query plan",
    description="Uses conversation state and recent messages. It never executes search or emits MongoDB queries.",
)
async def generate_query_plan(
    conversation_id: str,
    body: GenerateQueryPlanRequest,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> QueryPlan:
    try:
        return await service.generate_query_plan(conversation_id, body.intent, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except InvalidConversationError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)
    except QueryGenerationError:
        # Invalid model output is rejected rather than coerced into a query.
        raise HTTPException(status_code=502, detail="Query generation produced an invalid plan")
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Query generation is temporarily unavailable")


@router.post(
    "/products/query-preview",
    response_model=CompiledMongoQuery,
    summary="Compile validated product filters to a MongoDB query preview",
    description="Compiles only. It does not execute against MongoDB or alter existing product APIs.",
)
async def compile_product_query(
    body: ProductQueryRequest,
    builder: MongoQueryBuilder = Depends(get_mongo_query_builder),
) -> CompiledMongoQuery:
    return builder.build(body)


@router.post(
    "/products/hybrid-search",
    response_model=HybridRetrievalResult,
    summary="Run semantic product retrieval with metadata fallback",
    description="Expands the request, embeds it, retrieves the Atlas vector top 30, filters, ranks, then falls back to metadata search if needed.",
)
async def hybrid_search(
    body: HybridSearchRequest,
    retriever: HybridRetriever = Depends(get_hybrid_retriever),
) -> HybridRetrievalResult:
    return await retriever.retrieve(body)


@router.get(
    "/conversations/{conversation_id}/memory",
    response_model=MemoryContext,
    summary="Restore a bounded conversation memory context",
)
async def get_memory_context(
    conversation_id: str,
    token_budget: int = Query(default=3_000, ge=256, le=16_000),
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> MemoryContext:
    try:
        return await service.get_memory_context(conversation_id, token_budget, user_id)
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Conversation memory is temporarily unavailable")


@router.post(
    "/conversations/{conversation_id}/memory/sync",
    response_model=DeviceSyncResponse,
    summary="Synchronize memory for another device",
)
async def sync_memory(
    conversation_id: str,
    body: DeviceSyncRequest,
    user_id: str = Query(default="default", min_length=1, max_length=128),
    service: ConversationService = Depends(get_conversation_service),
) -> DeviceSyncResponse:
    try:
        logger.info("Memory sync requested for conversation %s from device %s", conversation_id, body.device_id)
        return await service.sync_memory(
            conversation_id,
            body.known_memory_version,
            body.token_budget,
            user_id,
        )
    except ConversationNotFoundError:
        raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Conversation memory is temporarily unavailable")


@router.post(
    "/responses/generate",
    response_model=GeneratedResponse,
    summary="Generate a grounded shopping response",
    description="Renders facts only from the supplied retrieved products; it never invents specifications.",
)
async def generate_response(
    body: ResponseGenerationRequest,
    generator: GroundedResponseGenerator = Depends(get_response_generator),
) -> GeneratedResponse:
    return await asyncio.to_thread(generator.generate, body)

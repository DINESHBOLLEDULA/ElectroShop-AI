# from fastapi import FastAPI
# from sqlalchemy import text
# from sqlalchemy.orm import Session
# from fastapi import Depends
# from database import get_db
# from models import Product
# from database import engine
# from models import Base
# from schemas import ProductResponse,CopilotChatRequest,CopilotChatResponse
# from gemini_service import generate_product_response
# from query_parser import parse_user_query

# app = FastAPI()

# Base.metadata.create_all(bind=engine)


# @app.get("/")
# def home():
#     return {
#         "message": "Backend running 🚀",
#         "status": "connected"
#     }


# @app.get("/health")
# def health_check():

#     try:
#         with engine.connect() as conn:
#             conn.execute(text("SELECT 1"))

#         return {
#             "status": "healthy",
#             "database": "connected"
#         }

#     except Exception as e:
#         return {
#             "status": "healthy",
#             "database": "failed",
#             "error": str(e)
#         }


# @app.get(
#     "/products",
#     response_model=
#     list[ProductResponse]
# )
# def get_products(
#     db: Session =
#     Depends(get_db)
# ):

#     products = (
#         db.query(Product)
#         .all()
#     )

#     return [
#         ProductResponse(
#             id=p.id,
#             name=p.name,
#             brand=p.brand,
#             price=p.price,
#             rating=p.rating,
#             reviews=p.reviews,
#             image=p.image,
#             categoryId=
#               p.category_id,
#             inStock=
#               p.in_stock,
#             tags=p.tags,
#             specs=p.specs,
#         )
#         for p in products
#     ]


# @app.get(
#     "/products/category/{category_id}",
#     response_model=
#     list[ProductResponse]
# )
# def get_products_by_category(
#     category_id: int,
#     db: Session =
#     Depends(get_db)
# ):

#     products = (
#         db.query(Product)
#         .filter(
#             Product.category_id
#             == category_id
#         )
#         .all()
#     )

#     return [
#         ProductResponse(
#             id=p.id,
#             name=p.name,
#             brand=p.brand,
#             price=p.price,
#             rating=p.rating,
#             reviews=p.reviews,
#             image=p.image,
#             categoryId=
#               p.category_id,
#             inStock=
#               p.in_stock,
#             tags=p.tags,
#             specs=p.specs,
#         )
#         for p in products
#     ]

# # SEARCH PRODUCTS
# @app.get(
#     "/products/search"
# )
# def search_products(
#     q: str,
#     db: Session =
#     Depends(get_db)
# ):
#     return (
#         db.query(Product)
#         .filter(
#             Product.name.ilike(
#                 f"%{q}%"
#             )
#         )
#         .all()
#     )

# def calculate_score(
#     product,
#     parsed_query
# ):

#     score = 0

#     tags = [
#         t.lower()
#         for t in (
#             product.tags or []
#         )
#     ]

#     specs = (
#         product.specs or {}
#     )

#     # BASE RATING
#     score += (
#         product.rating * 2
#     )

#     # REVIEWS
#     score += min(
#         product.reviews / 500,
#         5
#     )

#     use_case = (
#         parsed_query.get(
#             "use_case"
#         )
#     )

#     # ─── GAMING ───
#     if use_case == "gaming":

#         if any(
#             "gaming" in t
#             for t in tags
#         ):
#             score += 10

#         chipset = str(
#             specs.get(
#                 "chipset", ""
#             )
#         ).lower()

#         if (
#             "snapdragon 8"
#             in chipset
#         ):
#             score += 5

#         display = str(
#             specs.get(
#                 "display", ""
#             )
#         ).lower()

#         if (
#             "144hz"
#             in display
#             or "165hz"
#             in display
#         ):
#             score += 4

#     # ─── BATTERY ───
#     elif use_case == "battery":

#         battery = str(
#             specs.get(
#                 "battery", ""
#             )
#         )

#         if "6000" in battery:
#             score += 8

#         elif "5000" in battery:
#             score += 4

#     # ─── PREMIUM ───
#     elif use_case == "premium":

#         if (
#             product.price
#             > 800
#         ):
#             score += 8

#         if (
#             "flagship"
#             in " ".join(tags)
#             .lower()
#         ):
#             score += 5

#     # ─── STUDENT ───
#     elif use_case == "student":

#         if (
#             product.price
#             < 1000
#         ):
#             score += 5

#         if (
#             product.rating
#             >= 4.5
#         ):
#             score += 3

#     return score


# @app.post(
#     "/copilot/chat",
#     response_model=CopilotChatResponse
# )
# def copilot_chat(
#     body: CopilotChatRequest,
#     db: Session = Depends(get_db)
# ):

#     conversation_context = (
#     " ".join(
#         body.chat_history[-4:]
#     )
# )

#     enhanced_query = f"""
#     Previous conversation:
#     {conversation_context}

#     Current query:
#     {body.query}
#     """

#     parsed_query = (
#         parse_user_query(
#             enhanced_query
#         )
#     )

#     print(parsed_query)

#     query = db.query(Product)

#     # CATEGORY FILTER
#     if parsed_query.get(
#         "category_id"
#     ):
#         query = query.filter(
#             Product.category_id
#             == parsed_query[
#                 "category_id"
#             ]
#         )

#     # BUDGET FILTER
#     if parsed_query.get(
#         "budget"
#     ):
#         query = query.filter(
#             Product.price <=
#             parsed_query["budget"]
#         )

#     # BRAND FILTER
#     if parsed_query.get(
#         "brand"
#     ):
#         query = query.filter(
#             Product.brand.ilike(
#                 f"%{
#                     parsed_query[
#                         'brand'
#                     ]
#                 }%"
#             )
#         )

#         # SPEC FILTERS
#     spec_filters = (
#         parsed_query.get(
#             "spec_filters"
#         ) or {}
#     )

#     products = query.all()

#     filtered_products = []

#     for p in products:

#         match = True

#         specs = p.specs or {}
#         tags = p.tags or []

#         # CHIPSET
#         chipset = str(
#             specs.get(
#                 "chipset", ""
#             )
#         ).lower()

#         if (
#             "chipset"
#             in spec_filters
#         ):
#             wanted = (
#                 spec_filters[
#                     "chipset"
#                 ]
#                 .lower()
#             )

#             if wanted not in chipset:
#                 match = False

#         # DISPLAY
#         display = str(
#             specs.get(
#                 "display", ""
#             )
#         ).lower()

#         if (
#             "display"
#             in spec_filters
#         ):
#             wanted = (
#                 spec_filters[
#                     "display"
#                 ]
#                 .lower()
#             )

#             if wanted not in display:
#                 match = False

#         # BATTERY
#         battery = str(
#             specs.get(
#                 "battery", ""
#             )
#         ).lower()

#         if (
#             "battery"
#             in spec_filters
#         ):
#             wanted = (
#                 spec_filters[
#                     "battery"
#                 ]
#             )

#             if wanted not in battery:
#                 match = False

#         # ANC
#         anc = str(
#             specs.get(
#                 "anc", ""
#             )
#         ).lower()

#         if (
#             "anc"
#             in spec_filters
#         ):
#             if "anc" not in anc:
#                 match = False

#         # USE CASE
#         if parsed_query.get(
#             "use_case"
#         ):
#             use_case = (
#                 parsed_query[
#                     "use_case"
#                 ]
#                 .lower()
#             )

#             tag_string = (
#                 " ".join(tags)
#                 .lower()
#             )

#             if (
#                 use_case
#                 not in tag_string
#             ):
#                 match = False

#         if match:
#             filtered_products.append(
#                 p
#             )

#     products = sorted(
#     filtered_products,
#     key=lambda x:
#     calculate_score(
#         x,
#         parsed_query
#     ),
#     reverse=True
# )[:8]

   

#     formatted_products = [
#         ProductResponse(
#             id=p.id,
#             name=p.name,
#             brand=p.brand,
#             price=p.price,
#             rating=p.rating,
#             reviews=p.reviews,
#             image=p.image,
#             categoryId=p.category_id,
#             inStock=p.in_stock,
#             tags=p.tags,
#             specs=p.specs,
#         )
#         for p in products
#     ]

#     ai_message = (
#         generate_product_response(
#             body.query,
#             products
#         )
#     )

#     return CopilotChatResponse(
#         message=ai_message,
#         products=formatted_products
#     )
            
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from models import Product
from database import engine
from models import Base
from schemas import ProductResponse, CopilotChatRequest, CopilotChatResponse
from gemini_service import generate_product_response
from query_parser import parse_user_query

# ── Copilot V2 imports ──────────────────────────────────────
from copilot.database.mongodb import MongoDB
from copilot.router import router as copilot_router
from copilot.cache.redis_cache import RedisCache
from copilot.observability.metrics import metrics

load_dotenv()

# ── Logging ─────────────────────────────────────────────────
# WHY configure logging here?
#   main.py is the application entry point. Logging must be configured
#   before any module emits a log message. basicConfig is a no-op if
#   logging was already configured (safe for test environments).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("electroshop")
redis_cache = RedisCache(os.getenv("REDIS_URL"))


# ── Lifespan ────────────────────────────────────────────────
# WHY lifespan instead of @app.on_event("startup")?
#   on_event is deprecated in FastAPI ≥ 0.93. The lifespan context
#   manager is the modern replacement. It guarantees that shutdown
#   code runs even if startup partially fails (like a try/finally).
@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    # ── Startup ──
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DB", "electroshop_ai")

    try:
        await MongoDB.connect(mongodb_url, db_name=mongodb_db)
        logger.info("MongoDB ready")
    except Exception as exc:
        # Log but don't crash — existing PostgreSQL endpoints should
        # continue working even if MongoDB is unavailable. The copilot
        # endpoints will return 500 until MongoDB comes back.
        logger.error("MongoDB startup failed: %s — copilot endpoints will be unavailable", exc)

    await redis_cache.connect()

    yield

    # ── Shutdown ──
    await MongoDB.disconnect()
    await redis_cache.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title="ElectroShop AI",
    description="E-Commerce Backend with Conversational AI Copilot",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Mount copilot router ────────────────────────────────────
# WHY include_router instead of defining routes on app?
#   Modularity. The copilot module is self-contained. All its routes,
#   dependencies, and error handlers are encapsulated in the router.
#   Removing the copilot feature is a single line change.
app.include_router(copilot_router)


@app.middleware("http")
async def record_api_metrics(request: Request, call_next):
    import time
    started = time.perf_counter()
    response = await call_next(request)
    metrics.record(request.url.path, response.status_code, started)
    return response


@app.get("/v2/ops/metrics")
async def get_metrics():
    return metrics.snapshot()

# ── Existing PostgreSQL setup (unchanged) ───────────────────
Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {"message": "Backend running 🚀", "status": "connected"}


@app.get("/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "healthy", "database": "failed", "error": str(e)}


def build_product_response(p) -> ProductResponse:
    return ProductResponse(
        id=p.id,
        name=p.name,
        brand=p.brand,
        price=p.price,
        rating=p.rating,
        reviews=p.reviews,
        image=p.image,
        categoryId=p.category_id,
        inStock=p.in_stock,
        tags=p.tags or [],
        specs=p.specs or {},
    )


@app.get("/products", response_model=list[ProductResponse])
async def get_products(db: Session = Depends(get_db)):
    cached = await redis_cache.get("products", "all")
    if cached is not None:
        return cached
    products = db.query(Product).all()
    response = [build_product_response(p) for p in products]
    await redis_cache.set("products", "all", [item.model_dump(mode="json") for item in response], 300)
    return response


@app.get("/products/category/{category_id}", response_model=list[ProductResponse])
async def get_products_by_category(category_id: int, db: Session = Depends(get_db)):
    cached = await redis_cache.get("products", f"category:{category_id}")
    if cached is not None:
        return cached
    products = db.query(Product).filter(Product.category_id == category_id).all()
    response = [build_product_response(p) for p in products]
    await redis_cache.set("products", f"category:{category_id}", [item.model_dump(mode="json") for item in response], 300)
    return response


@app.get("/products/search")
def search_products(q: str, db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.name.ilike(f"%{q}%")).all()


# ─────────────────────────────────────────────
# SCORING ENGINE
# Covers all use_cases, spec keys, and tags
# from db.json across all 5 categories
# ─────────────────────────────────────────────
def calculate_score(product, parsed_query) -> float:
    score = 0.0

    tags = [t.lower() for t in (product.tags or [])]
    specs = product.specs or {}
    tag_string = " ".join(tags)

    # Base quality signals
    score += product.rating * 2          # max ~10
    score += min(product.reviews / 500, 5)  # max 5

    use_case = (parsed_query.get("use_case") or "").lower()
    features = [f.lower() for f in (parsed_query.get("features") or [])]

    # ── GAMING ──
    if use_case == "gaming":
        if "gaming" in tag_string:
            score += 10
        chipset = str(specs.get("chipset", "")).lower()
        gpu = str(specs.get("gpu", "")).lower()
        display = str(specs.get("display", "")).lower()
        if "snapdragon 8" in chipset:
            score += 5
        if any(g in gpu for g in ["rtx 4090", "rtx 4080", "rtx 4070", "rtx 4060"]):
            score += 6
        if "rtx" in gpu:
            score += 3
        if "144hz" in display or "165hz" in display or "240hz" in display:
            score += 4

    # ── BATTERY ──
    elif use_case == "battery":
        battery = str(specs.get("battery", "")).lower()
        if "6500" in battery:
            score += 10
        elif "6000" in battery:
            score += 8
        elif "5000" in battery:
            score += 4
        elif "4500" in battery:
            score += 2
        if "long battery" in tag_string:
            score += 5
        if "60hr" in tag_string or "50hr" in tag_string or "30hr" in tag_string:
            score += 4

    # ── PREMIUM ──
    elif use_case == "premium":
        if product.price > 800:
            score += 8
        if product.price > 1500:
            score += 4
        if any(t in tag_string for t in ["flagship", "luxury", "premium", "pro"]):
            score += 5

    # ── STUDENT ──
    elif use_case == "student":
        if product.price < 600:
            score += 8
        elif product.price < 900:
            score += 5
        elif product.price < 1200:
            score += 2
        if product.rating >= 4.5:
            score += 3
        if any(t in tag_string for t in ["value", "mid-range", "budget"]):
            score += 3

    # ── BUDGET ──
    elif use_case == "budget":
        if product.price < 300:
            score += 10
        elif product.price < 500:
            score += 7
        elif product.price < 800:
            score += 4
        if "budget" in tag_string or "value" in tag_string:
            score += 4

    # ── PHOTOGRAPHY ──
    elif use_case == "photography":
        sensor = str(specs.get("sensor", "")).lower()
        if "full frame" in sensor:
            score += 10
        elif "aps-c" in sensor:
            score += 6
        stabilization = str(specs.get("stabilization", "")).lower()
        if "ibis" in stabilization or "ibis" in tag_string:
            score += 5
        if "weather sealed" in tag_string or "weather_sealed" in str(specs.get("weather_sealed", "")).lower():
            score += 3
        camera_spec = str(specs.get("camera", "")).lower()
        if "200mp" in camera_spec or "200mp" in tag_string:
            score += 4
        if any(t in tag_string for t in ["pro", "flagship", "full frame"]):
            score += 3

    # ── VLOG ──
    elif use_case == "vlog":
        video = str(specs.get("video", "")).lower()
        if "8k" in video:
            score += 8
        elif "4k" in video:
            score += 6
        if "gimbal" in tag_string or "vlog" in tag_string:
            score += 6
        af = str(specs.get("af", "")).lower()
        if "ai" in af or "phase" in af:
            score += 4

    # ── ACTION / SPORTS ──
    elif use_case in ("action", "sports"):
        if "action" in tag_string or "sports" in tag_string:
            score += 8
        waterproof = str(specs.get("waterproof", "")).lower()
        if "waterproof" in waterproof or "waterproof" in tag_string:
            score += 6
        stabilization = str(specs.get("stabilization", "")).lower()
        if "hypersmooth" in stabilization or "hypersmooth" in tag_string:
            score += 4

    # ── PRODUCTIVITY / BUSINESS ──
    elif use_case in ("productivity", "business"):
        if any(t in tag_string for t in ["business", "vpro", "mil-spec", "ultralight"]):
            score += 6
        ram = str(specs.get("ram", "")).lower()
        if "32gb" in ram or "64gb" in ram:
            score += 4
        elif "16gb" in ram:
            score += 2
        if product.rating >= 4.5:
            score += 3

    # ── AUDIOPHILE ──
    elif use_case == "audiophile":
        codec = str(specs.get("codec", "")).lower()
        if "ldac" in codec or "aptx adaptive" in codec or "lhdc" in codec:
            score += 8
        if "audiophile" in tag_string:
            score += 6
        driver = str(specs.get("driver", "")).lower()
        if "40mm" in driver or "large" in driver:
            score += 3

    # ── PODCAST / CREATOR ──
    elif use_case in ("podcast", "creator"):
        if "podcast" in tag_string or "studio quality" in tag_string or "creator" in tag_string:
            score += 8
        microphones = str(specs.get("microphones", "")).lower()
        if microphones:
            score += 4

    # ── TRAVEL ──
    elif use_case == "travel":
        weight = str(specs.get("weight", "")).lower()
        if any(t in tag_string for t in ["ultralight", "compact", "portable", "slim", "sub-1kg"]):
            score += 7
        battery = str(specs.get("battery", "")).lower()
        if "5000" in battery or "6000" in battery:
            score += 4

    # ── BEGINNER ──
    elif use_case == "beginner":
        if "beginner" in tag_string or "value" in tag_string or "budget" in tag_string:
            score += 6
        if product.price < 600:
            score += 5
        if product.rating >= 4.3:
            score += 3

    # ─── Feature tag bonuses (from features list) ───
    for feat in features:
        if feat in tag_string:
            score += 3

    # ─── spec_filters bonus (reward exact matches) ───
    spec_filters = parsed_query.get("spec_filters") or {}
    for key, value in spec_filters.items():
        spec_val = str(specs.get(key, "")).lower()
        if value and value.lower() in spec_val:
            score += 5
        elif not value and key in specs:
            score += 3

    return score


# ─────────────────────────────────────────────
# SPEC FILTER MATCHING
# Hard-filter only on explicit spec_filters.
# use_case is passed to scoring only — NOT used
# to hard-exclude products (fixes the main bug).
# ─────────────────────────────────────────────
def passes_spec_filters(product, spec_filters: dict) -> bool:
    if not spec_filters:
        return True

    specs = product.specs or {}

    for key, wanted in spec_filters.items():
        actual = str(specs.get(key, "")).lower()

        # Special handling: empty wanted = just "must have this key"
        if wanted == "":
            if not actual or actual in ("false", "none", "null", "n/a"):
                return False
            continue

        # Boolean-like keys (weather_sealed, waterproof, foldable)
        if isinstance(specs.get(key), bool):
            if not specs[key]:
                return False
            continue

        # Normal substring match
        if wanted.lower() not in actual:
            return False

    return True


@app.post("/copilot/chat", response_model=CopilotChatResponse)
def copilot_chat(body: CopilotChatRequest, db: Session = Depends(get_db)):

    # Build context from recent history
    history_text = " | ".join(body.chat_history[-4:]) if body.chat_history else ""
    enhanced_query = f"Previous: {history_text}\nCurrent: {body.query}" if history_text else body.query

    parsed_query = parse_user_query(enhanced_query)
    print("PARSED:", parsed_query)

    # ── DB-level filters (fast elimination) ──
    query = db.query(Product)

    if parsed_query.get("category_id"):
        query = query.filter(Product.category_id == parsed_query["category_id"])

    if parsed_query.get("budget"):
        query = query.filter(Product.price <= parsed_query["budget"])

    if parsed_query.get("brand"):
        query = query.filter(Product.brand.ilike(f"%{parsed_query['brand']}%"))

    products = query.all()

    # ── Python-level spec_filter hard-filtering ──
    spec_filters = parsed_query.get("spec_filters") or {}
    filtered_products = [p for p in products if passes_spec_filters(p, spec_filters)]

    # ── If spec filtering removes everything, fall back to unfiltered ──
    # This prevents returning 0 results when specs are slightly off
    if not filtered_products and products:
        filtered_products = products

    # ── Score and rank ──
    ranked = sorted(
        filtered_products,
        key=lambda x: calculate_score(x, parsed_query),
        reverse=True
    )[:8]

    formatted_products = [build_product_response(p) for p in ranked]

    ai_message = generate_product_response(body.query, ranked)

    return CopilotChatResponse(message=ai_message, products=formatted_products)

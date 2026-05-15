from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from models import Product
from database import engine
from models import Base
from schemas import ProductResponse

app = FastAPI()

Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {
        "message": "Backend running 🚀",
        "status": "connected"
    }


@app.get("/health")
def health_check():

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:
        return {
            "status": "healthy",
            "database": "failed",
            "error": str(e)
        }


@app.get(
    "/products",
    response_model=
    list[ProductResponse]
)
def get_products(
    db: Session =
    Depends(get_db)
):

    products = (
        db.query(Product)
        .all()
    )

    return [
        ProductResponse(
            id=p.id,
            name=p.name,
            brand=p.brand,
            price=p.price,
            rating=p.rating,
            reviews=p.reviews,
            image=p.image,
            categoryId=
              p.category_id,
            inStock=
              p.in_stock,
            tags=p.tags,
            specs=p.specs,
        )
        for p in products
    ]


@app.get(
    "/products/category/{category_id}",
    response_model=
    list[ProductResponse]
)
def get_products_by_category(
    category_id: int,
    db: Session =
    Depends(get_db)
):

    products = (
        db.query(Product)
        .filter(
            Product.category_id
            == category_id
        )
        .all()
    )

    return [
        ProductResponse(
            id=p.id,
            name=p.name,
            brand=p.brand,
            price=p.price,
            rating=p.rating,
            reviews=p.reviews,
            image=p.image,
            categoryId=
              p.category_id,
            inStock=
              p.in_stock,
            tags=p.tags,
            specs=p.specs,
        )
        for p in products
    ]

# SEARCH PRODUCTS
@app.get(
    "/products/search"
)
def search_products(
    q: str,
    db: Session =
    Depends(get_db)
):
    return (
        db.query(Product)
        .filter(
            Product.name.ilike(
                f"%{q}%"
            )
        )
        .all()
    )
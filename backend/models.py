from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
)

from sqlalchemy.dialects.postgresql import JSONB

from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    category_id = Column(
        Integer,
        nullable=False
    )

    name = Column(
        String,
        nullable=False
    )

    brand = Column(
        String,
        nullable=False
    )

    price = Column(
        Float,
        nullable=False
    )

    rating = Column(
        Float,
        default=0
    )

    reviews = Column(
        Integer,
        default=0
    )

    in_stock = Column(
        Boolean,
        default=True
    )

    image = Column(
        String
    )

    specs = Column(
        JSONB
    )

    tags = Column(
        JSONB
    )
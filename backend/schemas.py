from pydantic import BaseModel
from pydantic import ConfigDict


class ProductResponse(
    BaseModel
):
    id: int
    name: str
    brand: str
    price: float
    rating: float
    reviews: int
    image: str
    categoryId: int
    inStock: bool
    tags: list[str]
    specs: dict

    model_config = ConfigDict(
        from_attributes=True
    )
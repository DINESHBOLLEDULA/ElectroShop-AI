# from pydantic import BaseModel
# from pydantic import ConfigDict
# from typing import List, Optional

# class ProductResponse(
#     BaseModel
# ):
#     id: int
#     name: str
#     brand: str
#     price: float
#     rating: float
#     reviews: int
#     image: str
#     categoryId: int
#     inStock: bool
#     tags: list[str]
#     specs: dict

#     model_config = ConfigDict(
#         from_attributes=True
#     )
# class CopilotChatRequest(BaseModel):
#     query: str
#     chat_history: list[str] = []


# class CopilotChatResponse(BaseModel):
#     message: str
#     products: List[ProductResponse] = []

from pydantic import BaseModel
from pydantic import ConfigDict
from typing import List, Optional, Any


class ProductResponse(BaseModel):
    id: int
    name: str
    brand: str
    price: float
    rating: float
    reviews: int
    image: str
    categoryId: int
    inStock: bool
    tags: List[str] = []
    specs: dict = {}

    model_config = ConfigDict(from_attributes=True)


class CopilotChatRequest(BaseModel):
    query: str
    chat_history: List[str] = []


class CopilotChatResponse(BaseModel):
    message: str
    products: List[ProductResponse] = []
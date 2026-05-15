import json

from database import SessionLocal
from models import Product


db = SessionLocal()


def seed_products():

    with open(
        "db.json",
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(
            file
        )

    products = data.get(
        "products",
        []
    )

    print(
        f"Found {len(products)} products"
    )

    for item in products:

        existing_product = (
            db.query(Product)
            .filter(
                Product.id ==
                item["id"]
            )
            .first()
        )

        # Skip duplicates
        if existing_product:
            print(
                f"Skipping "
                f"{item['name']}"
            )
            continue

        product = Product(
            id=item["id"],

            category_id=
            item.get(
                "categoryId",
                0
            ),

            name=item.get(
                "name",
                ""
            ),

            brand=item.get(
                "brand",
                ""
            ),

            price=item.get(
                "price",
                0
            ),

            rating=item.get(
                "rating",
                0
            ),

            reviews=item.get(
                "reviews",
                0
            ),

            in_stock=
            item.get(
                "inStock",
                True
            ),

            image=item.get(
                "image",
                ""
            ),

            specs=item.get(
                "specs",
                {}
            ),

            tags=item.get(
                "tags",
                []
            ),
        )

        db.add(product)

    db.commit()

    print(
        "Products seeded "
        "successfully 🚀"
    )


seed_products()
db.close()
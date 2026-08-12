# import os
# from dotenv import load_dotenv
# from google import genai

# load_dotenv()

# client = genai.Client(
#     api_key=os.getenv(
#         "GEMINI_API_KEY"
#     )
# )


# def generate_product_response(
#     user_query: str,
#     products: list
# ):
#     if not products:
#         return (
#             "I couldn't find matching "
#             "products. Try another search."
#         )

#     product_summary = "\n".join([
#         f"""
# Name: {p.name}
# Brand: {p.brand}
# Price: {p.price}
# Rating: {p.rating}
# """
#         for p in products[:5]
#     ])

#     prompt = f"""
# You are ElectroShop AI,
# an electronics shopping assistant.

# User query:
# {user_query}

# Products:
# {product_summary}

# Rules:
# - Recommend naturally
# - Mention strengths
# - Be concise
# - Maximum 3 sentences
# - Never invent specs
# - Use only provided products

# Write a shopping recommendation.
# """

#     try:
#         response = client.models.generate_content(
#             model="gemini-2.5-flash-lite",
#             contents=prompt,
#         )

#         return response.text

#     except Exception as e:
#         print(
#             "Gemini error:",
#             e
#         )

#         return (
#             "I found some products "
#             "that may suit your needs."
#         )

import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def _format_spec_value(value) -> str:
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value) if value is not None else "—"


def _build_product_summary(products: list) -> str:
    lines = []
    for i, p in enumerate(products[:6], 1):
        specs = p.specs or {}
        tags = p.tags or []

        spec_lines = "\n".join(
            f"    {k.replace('_', ' ').title()}: {_format_spec_value(v)}"
            for k, v in specs.items()
        )

        lines.append(f"""
Product {i}:
  Name: {p.name}
  Brand: {p.brand}
  Price: ${p.price}
  Rating: {p.rating}/5 ({p.reviews} reviews)
  Tags: {', '.join(tags)}
  Specs:
{spec_lines}
""")
    return "\n".join(lines)


def generate_product_response(user_query: str, products: list) -> str:
    if not products:
        return (
            "I couldn't find products matching your search. "
            "Try different keywords — for example, try the category name "
            "(phones, laptops, cameras, audio) or a brand name."
        )

    product_summary = _build_product_summary(products)

    prompt = f"""You are ElectroShop AI, a knowledgeable and friendly electronics shopping assistant.

User's question: {user_query}

Available products (already filtered and ranked by relevance):
{product_summary}

Instructions:
- Answer the user's question directly and naturally using ONLY the product data above.
- If they ask for a specific spec (battery, display, chipset, camera, etc.), mention those exact specs from the data.
- Highlight 1-3 top recommendations with brief reasoning.
- Be honest — if something has a weakness relevant to their query, mention it briefly.
- Keep response concise: 2-4 sentences max.
- Never invent specs or features not in the data.
- If prices or specs seem to directly answer their question, include them.
- Sound like a knowledgeable friend, not a sales pitch.

Write your response now:"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        return response.text.strip()

    except Exception as e:
        print("Gemini error:", e)
        # Fallback: build a minimal response from data
        top = products[0]
        return (
            f"Here are some great options for your search! "
            f"The {top.brand} {top.name} is a top pick at ${top.price} "
            f"with a {top.rating}★ rating."
        )
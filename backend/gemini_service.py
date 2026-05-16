import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv(
        "GEMINI_API_KEY"
    )
)


def generate_product_response(
    user_query: str,
    products: list
):
    if not products:
        return (
            "I couldn't find matching "
            "products. Try another search."
        )

    product_summary = "\n".join([
        f"""
Name: {p.name}
Brand: {p.brand}
Price: {p.price}
Rating: {p.rating}
"""
        for p in products[:5]
    ])

    prompt = f"""
You are ElectroShop AI,
an electronics shopping assistant.

User query:
{user_query}

Products:
{product_summary}

Rules:
- Recommend naturally
- Mention strengths
- Be concise
- Maximum 3 sentences
- Never invent specs
- Use only provided products

Write a shopping recommendation.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )

        return response.text

    except Exception as e:
        print(
            "Gemini error:",
            e
        )

        return (
            "I found some products "
            "that may suit your needs."
        )
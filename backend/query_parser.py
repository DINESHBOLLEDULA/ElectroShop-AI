# import json
# from google import genai
# from dotenv import load_dotenv
# import os

# load_dotenv()

# client = genai.Client(
#     api_key=os.getenv(
#         "GEMINI_API_KEY"
#     )
# )

# CATEGORY_MAP = {
#     "phone": 1,
#     "smartphone": 1,
#     "mobile": 1,

#     "laptop": 2,
#     "notebook": 2,

#     "tablet": 3,
#     "ipad": 3,

#     "camera": 4,

#     "audio": 5,
#     "headphone": 5,
#     "headphones": 5,
#     "earbuds": 5,
#     "earphones": 5,
#     "speaker": 5,
# }


# def normalize_category(
#     category: str | None
# ):
#     if not category:
#         return None

#     category = (
#         category.lower().strip()
#     )

#     return CATEGORY_MAP.get(
#         category
#     )


# def parse_user_query(query: str):
#     prompt = f"""
# You are an electronics
# shopping query parser.

# Your ONLY task is to
# convert the query into
# structured JSON.

# Never recommend products.

# Conversation input:
# {query}

# Return ONLY valid JSON.

# Schema:
# {{
#   "category": string | null,
#   "budget": number | null,
#   "brand": string | null,
#   "use_case": string | null,
#   "sort_by": string | null,
#   "features": [],
#   "spec_filters": {{}}
# }}

# Allowed categories:
# phone
# laptop
# tablet
# camera
# audio

# Allowed use_case:
# gaming
# student
# photography
# battery
# productivity
# premium

# Examples:

# Query:
# gaming phones under 800

# Output:
# {{
# "category":"phone",
# "budget":800,
# "brand":null,
# "use_case":"gaming",
# "sort_by":"performance",
# "features":["gaming"],
# "spec_filters":{{}}
# }}

# Query:
# phones with 6000mAh battery

# Output:
# {{
# "category":"phone",
# "budget":null,
# "brand":null,
# "use_case":"battery",
# "sort_by":"battery",
# "features":["battery"],
# "spec_filters":
# {{
# "battery":"6000"
# }}
# }}

# Query:
# Snapdragon 8 Elite phones

# Output:
# {{
# "category":"phone",
# "budget":null,
# "brand":null,
# "use_case":"performance",
# "sort_by":"performance",
# "features":["chipset"],
# "spec_filters":
# {{
# "chipset":
# "Snapdragon 8 Elite"
# }}
# }}

# Query:
# OLED laptops

# Output:
# {{
# "category":"laptop",
# "budget":null,
# "brand":null,
# "use_case":null,
# "sort_by":"display",
# "features":["OLED"],
# "spec_filters":
# {{
# "display":"OLED"
# }}
# }}

# Now parse:
# {query}
# """

#     try:
#         response = (
#             client.models.generate_content(
#                 model="gemini-2.5-flash-lite",
#                 contents=prompt,
#             )
#         )

#         cleaned = (
#             response.text
#             .replace("```json", "")
#             .replace("```", "")
#             .strip()
#         )

#         parsed = json.loads(cleaned)
        
#         query_lower = query.lower()

#         # CATEGORY FALLBACK
#         if any(
#             x in query_lower
#             for x in [
#                 "phone",
#                 "phones",
#                 "mobile",
#                 "mobiles",
#                 "smartphone",
#                 "smartphones",
#             ]
#         ):
#             parsed["category"] = "phone"

#         elif any(
#             x in query_lower
#             for x in [
#                 "laptop",
#                 "laptops",
#                 "notebook",
#                 "notebooks",
#             ]
#         ):
#             parsed["category"] = "laptop"

#         elif any(
#             x in query_lower
#             for x in [
#                 "tablet",
#                 "tablets",
#                 "ipad",
#                 "ipads",
#             ]
#         ):
#             parsed["category"] = "tablet"

#         elif any(
#             x in query_lower
#             for x in [
#                 "camera",
#                 "cameras",
#             ]
#         ):
#             parsed["category"] = "camera"

#         elif any(
#             x in query_lower
#             for x in [
#                 "earbud",
#                 "earbuds",
#                 "headphone",
#                 "headphones",
#                 "speaker",
#                 "speakers",
#                 "audio",
#             ]
#         ):
#             parsed["category"] = "audio"

#         parsed["category_id"] = (
#             normalize_category(
#                 parsed.get("category")
#             )
#         )
#         print(
#     "PARSED QUERY:",
#     parsed
# )
#         return parsed

#     except Exception as e:
#         print(
#             "Query parse error:",
#             e
#         )

#         return {
#             "category": None,
#             "budget": None,
#             "brand": None,
#             "use_case": None,
#             "sort_by": None,
#         }

import json
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

CATEGORY_MAP = {
    "phone": 1,
    "smartphone": 1,
    "mobile": 1,
    "laptop": 2,
    "notebook": 2,
    "tablet": 3,
    "ipad": 3,
    "camera": 4,
    "audio": 5,
    "headphone": 5,
    "headphones": 5,
    "earbuds": 5,
    "earphones": 5,
    "speaker": 5,
    "speakers": 5,
}

# All spec keys that exist across all products in db.json
# phones/tablets/laptops: display, battery, camera, ram, storage, weight, os, chipset, connectivity, color, gpu, ports
# cameras: sensor, display, battery, video, af, weight, storage, stabilization, mount, weather_sealed, color
# audio: type, driver, battery, anc, weight, connectivity, codec, charging, microphones, foldable, color, waterproof

SPEC_KEY_ALIASES = {
    # display
    "oled": ("display", "OLED"),
    "amoled": ("display", "AMOLED"),
    "120hz": ("display", "120Hz"),
    "144hz": ("display", "144Hz"),
    "165hz": ("display", "165Hz"),
    "240hz": ("display", "240Hz"),
    "qhd": ("display", "QHD"),
    "4k display": ("display", "4K"),
    "retina": ("display", "Retina"),

    # battery
    "6500mah": ("battery", "6500"),
    "6000mah": ("battery", "6000"),
    "5000mah": ("battery", "5000"),
    "4500mah": ("battery", "4500"),

    # chipset
    "snapdragon 8 elite": ("chipset", "Snapdragon 8 Elite"),
    "snapdragon 8": ("chipset", "Snapdragon 8"),
    "snapdragon": ("chipset", "Snapdragon"),
    "dimensity": ("chipset", "Dimensity"),
    "apple silicon": ("chipset", "Apple"),
    "m4 pro": ("chipset", "M4 Pro"),
    "m4": ("chipset", "M4"),
    "m3": ("chipset", "M3"),
    "m2": ("chipset", "M2"),
    "intel": ("chipset", "Intel"),
    "amd": ("chipset", "AMD"),
    "ryzen": ("chipset", "Ryzen"),

    # gpu (laptops)
    "rtx 4090": ("gpu", "RTX 4090"),
    "rtx 4080": ("gpu", "RTX 4080"),
    "rtx 4070": ("gpu", "RTX 4070"),
    "rtx 4060": ("gpu", "RTX 4060"),
    "rtx": ("gpu", "RTX"),

    # ram
    "16gb ram": ("ram", "16GB"),
    "32gb ram": ("ram", "32GB"),
    "8gb ram": ("ram", "8GB"),

    # camera (phones)
    "200mp": ("camera", "200MP"),
    "periscope": ("camera", "periscope"),

    # audio-specific
    "anc": ("anc", ""),
    "active noise": ("anc", ""),
    "ldac": ("codec", "LDAC"),
    "aptx": ("codec", "aptX"),
    "lhdc": ("codec", "LHDC"),
    "dolby atmos": ("codec", "Dolby"),

    # camera-specific
    "full frame": ("sensor", "Full Frame"),
    "aps-c": ("sensor", "APS-C"),
    "4k video": ("video", "4K"),
    "8k video": ("video", "8K"),
    "ibis": ("stabilization", "IBIS"),
    "weather sealed": ("weather_sealed", ""),
    "waterproof": ("waterproof", ""),

    # connectivity
    "5g": ("connectivity", "5G"),
    "wifi 7": ("connectivity", "WiFi 7"),
    "wifi 6": ("connectivity", "WiFi 6"),
    "bluetooth": ("connectivity", "Bluetooth"),
    "nfc": ("connectivity", "NFC"),
    "usb-c": ("ports", "USB"),
    "thunderbolt": ("ports", "Thunderbolt"),
}


def normalize_category(category: str | None):
    if not category:
        return None
    return CATEGORY_MAP.get(category.lower().strip())


def parse_user_query(query: str):
    prompt = f"""
You are an electronics shopping query parser for ElectroShop.

Your ONLY job: convert user queries into structured JSON.
Never recommend products or add commentary.

Products available:
- Category 1: Phones (Samsung, Apple, Google, OnePlus, Xiaomi, Oppo, Sony, Motorola, Nothing, Vivo, Asus ROG, Honor, Realme)
- Category 2: Laptops (MacBook, Dell XPS, ThinkPad, HP Spectre, ROG Zephyrus, Surface Pro, Galaxy Book, Razer Blade, LG Gram, Framework, MacBook Air, HP EliteBook, Lenovo Legion, MSI Prestige)
- Category 3: Tablets (iPad Pro, Galaxy Tab, iPad Air, Surface Pro, Lenovo Tab, Amazon Fire, Xiaomi Pad, OnePlus Pad, Huawei MatePad, Google Pixel Tablet, iPad Mini, Asus ROG Flow)
- Category 4: Cameras (Sony A7R V, Canon EOS R5, Nikon Z9, Fujifilm X100VI, GoPro Hero 13, DJI Osmo Pocket, Sony ZV-E10 II, Canon PowerShot V10, Nikon Z50 II, Sigma FP II, Insta360 X5)
- Category 5: Audio (Sony WH-1000XM6, Bose QC45, AirPods Pro 3, Sennheiser Momentum 4, Samsung Galaxy Buds 3 Pro, Jabra Evolve2 85, Nothing Ear 2, Anker Soundcore Liberty 4 NC, JBL Tour Pro 3, Bowers & Wilkins Px8, Marshall Emberton III, Sonos Era 300, Harman Kardon Aura Studio 4, Shure MV7+)

Available spec_filter keys (ONLY use keys that exist for the product category):
- Phones/Tablets/Laptops: display, battery, chipset, ram, storage, camera, gpu, os, connectivity, ports
- Cameras: sensor, video, af, stabilization, weather_sealed, mount
- Audio: anc, codec, battery, driver, type, charging, microphones, waterproof

Conversation input:
{query}

Return ONLY valid JSON. No markdown, no preamble.

Schema:
{{
  "category": string | null,
  "budget": number | null,
  "brand": string | null,
  "use_case": string | null,
  "sort_by": string | null,
  "features": [],
  "spec_filters": {{}}
}}

Allowed categories: phone, laptop, tablet, camera, audio
Allowed use_case: gaming, student, photography, battery, productivity, premium, business, budget, vlog, podcast, audiophile, travel, sports, action, beginner, creator

Examples:

Input: "gaming phones under 800"
Output: {{"category":"phone","budget":800,"brand":null,"use_case":"gaming","sort_by":"performance","features":["gaming"],"spec_filters":{{}}}}

Input: "phones with 6000mAh battery"
Output: {{"category":"phone","budget":null,"brand":null,"use_case":"battery","sort_by":"battery","features":["battery"],"spec_filters":{{"battery":"6000"}}}}

Input: "Snapdragon 8 Elite phones"
Output: {{"category":"phone","budget":null,"brand":null,"use_case":null,"sort_by":"performance","features":["chipset"],"spec_filters":{{"chipset":"Snapdragon 8 Elite"}}}}

Input: "OLED laptops"
Output: {{"category":"laptop","budget":null,"brand":null,"use_case":null,"sort_by":"display","features":["OLED"],"spec_filters":{{"display":"OLED"}}}}

Input: "best ANC headphones under 400"
Output: {{"category":"audio","budget":400,"brand":null,"use_case":"audiophile","sort_by":"anc","features":["ANC"],"spec_filters":{{"anc":""}}}}

Input: "RTX 4080 gaming laptops"
Output: {{"category":"laptop","budget":null,"brand":null,"use_case":"gaming","sort_by":"performance","features":["gaming","RTX 4080"],"spec_filters":{{"gpu":"RTX 4080"}}}}

Input: "Sony cameras for vlogging"
Output: {{"category":"camera","budget":null,"brand":"Sony","use_case":"vlog","sort_by":"video","features":["vlog"],"spec_filters":{{}}}}

Input: "budget wireless earbuds with LDAC"
Output: {{"category":"audio","budget":null,"brand":null,"use_case":"budget","sort_by":"value","features":["LDAC","TWS"],"spec_filters":{{"codec":"LDAC"}}}}

Input: "MacBook for students"
Output: {{"category":"laptop","budget":null,"brand":"Apple","use_case":"student","sort_by":"value","features":["student"],"spec_filters":{{}}}}

Input: "full frame mirrorless cameras"
Output: {{"category":"camera","budget":null,"brand":null,"use_case":"photography","sort_by":"quality","features":["Full Frame"],"spec_filters":{{"sensor":"Full Frame"}}}}

Input: "action cameras waterproof"
Output: {{"category":"camera","budget":null,"brand":null,"use_case":"action","sort_by":"features","features":["waterproof","action"],"spec_filters":{{"waterproof":""}}}}

Now parse this:
{query}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )

        cleaned = (
            response.text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(cleaned)

        # ── Category keyword fallback (only if Gemini returned null) ──
        query_lower = query.lower()

        if not parsed.get("category"):
            if any(x in query_lower for x in ["phone", "phones", "mobile", "mobiles", "smartphone", "smartphones"]):
                parsed["category"] = "phone"
            elif any(x in query_lower for x in ["laptop", "laptops", "notebook", "notebooks", "macbook"]):
                parsed["category"] = "laptop"
            elif any(x in query_lower for x in ["tablet", "tablets", "ipad", "ipads"]):
                parsed["category"] = "tablet"
            elif any(x in query_lower for x in ["camera", "cameras", "mirrorless", "dslr", "gopro", "dji", "action cam"]):
                parsed["category"] = "camera"
            elif any(x in query_lower for x in ["earbud", "earbuds", "headphone", "headphones", "speaker", "speakers", "audio", "earphone", "earphones", "tws", "anc headphones"]):
                parsed["category"] = "audio"

        # ── Brand keyword fallback ──
        if not parsed.get("brand"):
            brands = [
                "Samsung", "Apple", "Google", "OnePlus", "Xiaomi", "Oppo",
                "Sony", "Motorola", "Nothing", "Vivo", "Asus", "Honor",
                "Realme", "Dell", "Lenovo", "HP", "Microsoft", "Razer",
                "LG", "Acer", "Framework", "MSI", "Canon", "Nikon",
                "Fujifilm", "GoPro", "DJI", "Ricoh", "Sigma", "Panasonic",
                "Leica", "OM System", "Insta360", "Bose", "Sennheiser",
                "Jabra", "JBL", "Anker", "Bowers & Wilkins", "Marshall",
                "Sonos", "Harman Kardon", "Shure", "Amazon", "Huawei",
            ]
            for brand in brands:
                if brand.lower() in query_lower:
                    parsed["brand"] = brand
                    break

        # ── spec_filters fallback from SPEC_KEY_ALIASES ──
        spec_filters = parsed.get("spec_filters") or {}
        for keyword, (spec_key, spec_value) in SPEC_KEY_ALIASES.items():
            if keyword in query_lower and spec_key not in spec_filters:
                spec_filters[spec_key] = spec_value
        parsed["spec_filters"] = spec_filters

        # ── budget fallback: look for "under X", "below X", "less than X", "within X" ──
        if not parsed.get("budget"):
            import re
            budget_match = re.search(
                r'(?:under|below|less than|within|max|upto|up to)\s*\$?\s*(\d+)',
                query_lower
            )
            if budget_match:
                parsed["budget"] = float(budget_match.group(1))

        # ── Resolve category_id ──
        parsed["category_id"] = normalize_category(parsed.get("category"))

        print("PARSED QUERY:", parsed)
        return parsed

    except Exception as e:
        print("Query parse error:", e)
        return {
            "category": None,
            "budget": None,
            "brand": None,
            "use_case": None,
            "sort_by": None,
            "features": [],
            "spec_filters": {},
            "category_id": None,
        }
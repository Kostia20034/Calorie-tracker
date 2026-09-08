import json

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.image_meal import DetectedFoodResponse


def analyze_food_image(image_bytes: bytes, content_type: str) -> DetectedFoodResponse:
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = """Analyze this food photo. For each distinct food item visible, provide:
- name: the food item's name
- quantity: numeric count of items or numeric number of portions; use 1 for a shared dish portion
- portion_description: short description such as "3 medium bananas" or "1 plate of rice"
- estimated_calories: approximate calories for the visible amount
- protein_g, carbs_g, fat_g: approximate macros in grams for the visible amount

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "portion_description": "string",
      "estimated_calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "total_calories": number
}"""

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=content_type),
            prompt,
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    try:
        return DetectedFoodResponse.model_validate(json.loads(response.text))
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid food analysis") from exc
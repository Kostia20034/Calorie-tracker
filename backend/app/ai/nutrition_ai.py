import json
import re

import requests

from app.core.config import settings
from app.schemas.food import FoodManualEntryRequest

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_PROMPT = (
    "Extract nutritional information from the user's food description. "
    "Return ONLY JSON with: name, calories, protein, carbs, fat, serving_size_grams."
)

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "name": {"type": "STRING"},
        "calories": {"type": "NUMBER"},
        "protein": {"type": "NUMBER"},
        "carbs": {"type": "NUMBER"},
        "fat": {"type": "NUMBER"},
        "serving_size_grams": {"type": "NUMBER"},
    },
    "required": ["name", "calories", "protein", "carbs", "fat", "serving_size_grams"],
}


def get_nutrition_from_ai(food_description: str) -> dict:
    """
    Sends a food description to Gemini and returns structured
    nutrition data as a dict: name, calories, protein, carbs, fat, serving_size_grams.
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    model = settings.gemini_model or "gemini-2.5-flash"

    try:
        response = requests.post(
            GEMINI_URL.format(model=model),
            headers={
                "x-goog-api-key": settings.gemini_api_key,
                "Content-Type": "application/json",
            },
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [
                    {"role": "user", "parts": [{"text": food_description}]}
                ],
                "generationConfig": {
                    "temperature": 0,
                    # Thinking models spend part of this budget on reasoning,
                    # so keep it well above the size of the JSON output.
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                    "responseSchema": RESPONSE_SCHEMA,
                },
            },
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
    except requests.Timeout as exc:
        raise ValueError("Nutrition AI timed out. Try again shortly.") from exc
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        body = exc.response.text if exc.response is not None else ""
        if status_code in {401, 403} or (
            status_code == 400 and "API key" in body
        ):
            raise ValueError(
                "Nutrition AI rejected GEMINI_API_KEY. Check the key in backend/.env."
            ) from exc
        if status_code == 404:
            raise ValueError(
                f"Gemini model '{model}' not found. Check GEMINI_MODEL in backend/.env."
            ) from exc
        if status_code == 429:
            raise ValueError(
                "Nutrition AI rate limit reached. Try again shortly."
            ) from exc
        raise ValueError("Nutrition AI provider returned an error.") from exc
    except (requests.RequestException, KeyError, IndexError, TypeError) as exc:
        # KeyError/IndexError also happens when Gemini blocks or returns no candidates
        raise ValueError("Nutrition AI is temporarily unavailable.") from exc

    if not isinstance(raw_content, str) or not raw_content.strip():
        raise ValueError("Nutrition AI returned an empty response")

    cleaned = raw_content.strip()

    for _ in range(2):
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(
                r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE
            )
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                raise ValueError(f"Unexpected AI response: {raw_content!r}")

        if isinstance(parsed, str):
            cleaned = parsed.strip()
            continue

        try:
            return FoodManualEntryRequest.model_validate(parsed).model_dump()
        except ValueError as exc:
            raise ValueError("Nutrition AI returned incomplete nutrition data") from exc

    raise ValueError("Nutrition AI returned an invalid response")
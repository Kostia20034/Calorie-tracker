import json
import re

import requests

from app.core.config import settings


def get_nutrition_from_ai(food_description: str) -> dict:
    """
    Sends a food description to the AI model and returns structured
    nutrition data as a dict: name, calories, protein, carbs, fat, serving_size_grams.
    """
    response = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.nvidia_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "moonshotai/kimi-k3",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Extract nutritional information from the user's food description. "
                        "Return ONLY JSON with: name, calories, protein, carbs, fat, serving_size_grams."
                    ),
                },
                {"role": "user", "content": food_description},
            ],
            "temperature": 0,
            "max_tokens": 2000,
            "stream": False,
        },
    )
    response.raise_for_status()
    data = response.json()

    raw_content = data["choices"][0]["message"]["content"]
    cleaned = raw_content.strip()

    for _ in range(2):
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                raise ValueError(f"Unexpected AI response: {raw_content!r}")

        if isinstance(parsed, str):
            cleaned = parsed.strip()
            continue

        return parsed

    raise ValueError(f"Unexpected AI response: {raw_content!r}")
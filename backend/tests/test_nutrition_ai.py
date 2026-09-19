# tests/test_nutrition_ai.py
import json
from unittest.mock import MagicMock
import requests

import pytest

from app.ai.nutrition_ai import get_nutrition_from_ai


def test_get_nutrition_from_ai_parses_model_response(monkeypatch):
    fake_nutrition = {
        "name": "Grilled chicken breast",
        "calories": 330,
        "protein": 62,
        "carbs": 0,
        "fat": 7.2,
        "serving_size_grams": 200,
    }
    fenced_content = f"```json\n{json.dumps(fake_nutrition, indent=2)}\n```"
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps(fenced_content)}}]
    }

    mock_post = MagicMock(return_value=fake_response)
    monkeypatch.setattr("app.ai.nutrition_ai.requests.post", mock_post)

    result = get_nutrition_from_ai("200g grilled chicken breast")

    assert result == fake_nutrition
    mock_post.assert_called_once()

    # Confirm the actual user description was sent, not a hardcoded string
    sent_payload = mock_post.call_args.kwargs["json"]
    user_message = sent_payload["messages"][1]["content"]
    assert user_message == "200g grilled chicken breast"


def test_get_nutrition_from_ai_requires_api_key(monkeypatch):
    monkeypatch.setattr("app.ai.nutrition_ai.settings", MagicMock(nvidia_api_key=""))

    with pytest.raises(ValueError, match="AI_API_KEY is not configured"):
        get_nutrition_from_ai("one banana")


def test_get_nutrition_from_ai_handles_timeout(monkeypatch):
    monkeypatch.setattr(
        "app.ai.nutrition_ai.settings", MagicMock(nvidia_api_key="test-key")
    )
    monkeypatch.setattr(
        "app.ai.nutrition_ai.requests.post",
        MagicMock(side_effect=requests.Timeout),
    )

    with pytest.raises(ValueError, match="timed out"):
        get_nutrition_from_ai("one banana")


def test_get_nutrition_from_ai_reports_invalid_api_key(monkeypatch):
    monkeypatch.setattr(
        "app.ai.nutrition_ai.settings", MagicMock(nvidia_api_key="test-key")
    )
    response = MagicMock()
    response.status_code = 401
    response.raise_for_status.side_effect = requests.HTTPError(response=response)
    monkeypatch.setattr(
        "app.ai.nutrition_ai.requests.post", MagicMock(return_value=response)
    )

    with pytest.raises(ValueError, match="rejected AI_API_KEY"):
        get_nutrition_from_ai("one banana")

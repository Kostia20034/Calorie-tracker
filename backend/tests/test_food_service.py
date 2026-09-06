# tests/test_food_service.py (add this to your existing file)
from unittest.mock import MagicMock
from app.services.food_service import create_food_from_description


def test_create_food_from_description_saves_to_db(db_session, monkeypatch):
    fake_nutrition = {
        "name": "Banana",
        "calories": 105,
        "protein": 1.3,
        "carbs": 27,
        "fat": 0.4,
        "serving_size_grams": 118,
    }

    mock_ai_call = MagicMock(return_value=fake_nutrition)
    monkeypatch.setattr("app.services.food_service.get_nutrition_from_ai", mock_ai_call)

    food = create_food_from_description(db_session, "one medium banana")

    assert food.id is not None          # confirms it was actually saved (got an ID)
    assert food.name == "Banana"
    assert food.calories == 105
    mock_ai_call.assert_called_once_with("one medium banana")
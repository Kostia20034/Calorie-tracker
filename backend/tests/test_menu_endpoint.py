from datetime import date, time

from app.models.meal import MealCategory
from app.schemas.image_meal import DetectedFoodResponse
from app.services.menu_service import get_meal_category


def test_get_meal_category_uses_expected_time_boundaries():
    assert get_meal_category(time(11, 59)) == MealCategory.BREAKFAST
    assert get_meal_category(time(12, 0)) == MealCategory.LUNCH
    assert get_meal_category(time(14, 59)) == MealCategory.LUNCH
    assert get_meal_category(time(15, 0)) == MealCategory.DINNER


def test_add_food_from_image_creates_menu_items(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        "app.services.image_meal_service.saveFile",
        lambda image_bytes, file_name, content_type: "meal-image-key",
    )
    monkeypatch.setattr(
        "app.services.image_meal_service.analyze_food_image",
        lambda image_bytes, content_type: DetectedFoodResponse.model_validate(
            {
                "items": [
                    {
                        "name": "Banana",
                        "quantity": 3,
                        "portion_description": "3 medium bananas",
                        "estimated_calories": 105,
                        "protein_g": 1.3,
                        "carbs_g": 27,
                        "fat_g": 0.4,
                    }
                ],
                "total_calories": 105,
            }
        ),
    )

    response = client.post(
        "/v1/api/menu/from-image",
        headers=auth_headers,
        params={"date": "2026-09-07"},
        files={"image": ("banana.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 201
    assert response.json()["items"][0]["food_name"] == "Banana"
    assert response.json()["items"][0]["quantity"] == 3
    assert response.json()["items"][0]["calories"] == 105
    assert response.json()["totals"]["calories"] == 105
    assert response.json()["image_key"] == "meal-image-key"


def test_add_food_from_image_rejects_non_image(client, auth_headers):
    response = client.post(
        "/v1/api/menu/from-image",
        headers=auth_headers,
        params={"date": "2026-09-07"},
        files={"image": ("notes.txt", b"not-an-image", "text/plain")},
    )

    assert response.status_code == 415


def test_add_food_to_menu_creates_daily_item(client, auth_headers):
    food_response = client.post(
        "/v1/api/foods/manual",
        headers=auth_headers,
        json={
            "name": "Oats",
            "calories": 150,
            "protein": 5,
            "carbs": 27,
            "fat": 3,
            "serving_size_grams": 40,
        },
    )
    food_id = food_response.json()["id"]

    response = client.post(
        "/v1/api/menu/items",
        headers=auth_headers,
        json={
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 1.5,
        },
    )

    assert response.status_code == 201
    assert response.json()["food_name"] == "Oats"
    assert response.json()["category"] in {"breakfast", "lunch", "dinner"}
    assert response.json()["quantity"] == 1.5
    assert response.json()["calories"] == 225
    assert response.json()["protein"] == 7.5


def test_add_food_to_menu_returns_404_for_unknown_food(client, auth_headers):
    response = client.post(
        "/v1/api/menu/items",
        headers=auth_headers,
        json={
            "date": date.today().isoformat(),
            "food_id": 999,
            "quantity": 1,
        },
    )

    assert response.status_code == 404


def test_get_daily_menu_returns_empty_menu_for_date_without_items(client, auth_headers):
    response = client.get(
        "/v1/api/menu",
        headers=auth_headers,
        params={"date": "2026-09-06"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "meal_id": None,
        "date": "2026-09-06",
        "items": [],
        "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    }


def test_get_daily_menu_returns_items_and_totals(client, auth_headers):
    food_response = client.post(
        "/v1/api/foods/manual",
        headers=auth_headers,
        json={
            "name": "Rice",
            "calories": 200,
            "protein": 4,
            "carbs": 45,
            "fat": 1,
            "serving_size_grams": 150,
        },
    )
    food_id = food_response.json()["id"]

    client.post(
        "/v1/api/menu/items",
        headers=auth_headers,
        json={
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 2,
        },
    )

    response = client.get(
        "/v1/api/menu",
        headers=auth_headers,
        params={"date": "2026-09-06"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == "2026-09-06"
    assert len(body["items"]) == 1
    assert body["totals"] == {
        "calories": 400,
        "protein": 8,
        "carbs": 90,
        "fat": 2,
    }


def test_update_menu_item_changes_quantity_and_nutrition(client, auth_headers):
    food_response = client.post(
        "/v1/api/foods/manual",
        headers=auth_headers,
        json={
            "name": "Yogurt",
            "calories": 100,
            "protein": 10,
            "carbs": 8,
            "fat": 2,
            "serving_size_grams": 150,
        },
    )
    food_id = food_response.json()["id"]
    create_response = client.post(
        "/v1/api/menu/items",
        headers=auth_headers,
        json={
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 1,
        },
    )
    item_id = create_response.json()["id"]

    response = client.patch(
        f"/v1/api/menu/items/{item_id}",
        headers=auth_headers,
        json={"quantity": 2.5},
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2.5
    assert response.json()["calories"] == 250
    assert response.json()["protein"] == 25
    assert response.json()["carbs"] == 20
    assert response.json()["fat"] == 5


def test_update_menu_item_returns_404_for_unknown_or_other_user_item(client, auth_headers):
    response = client.patch(
        "/v1/api/menu/items/999",
        headers=auth_headers,
        json={"quantity": 2},
    )

    assert response.status_code == 404


def test_delete_menu_item_removes_item_from_daily_menu(client, auth_headers):
    food_response = client.post(
        "/v1/api/foods/manual",
        headers=auth_headers,
        json={
            "name": "Toast",
            "calories": 80,
            "protein": 3,
            "carbs": 14,
            "fat": 1,
            "serving_size_grams": 30,
        },
    )
    create_response = client.post(
        "/v1/api/menu/items",
        headers=auth_headers,
        json={
            "date": "2026-09-06",
            "food_id": food_response.json()["id"],
            "quantity": 1,
        },
    )
    item_id = create_response.json()["id"]

    response = client.delete(
        f"/v1/api/menu/items/{item_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Menu item deleted successfully",
        "id": item_id,
    }

    menu_response = client.get(
        "/v1/api/menu",
        headers=auth_headers,
        params={"date": "2026-09-06"},
    )
    assert menu_response.json()["items"] == []
    assert menu_response.json()["totals"] == {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
    }


def test_delete_menu_item_returns_404_for_unknown_item(client, auth_headers):
    response = client.delete(
        "/v1/api/menu/items/999",
        headers=auth_headers,
    )

    assert response.status_code == 404
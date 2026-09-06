from datetime import date


def test_add_food_to_menu_creates_daily_item(client):
    food_response = client.post(
        "/v1/api/foods/manual",
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
        json={
            "user_id": 1,
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 1.5,
        },
    )

    assert response.status_code == 201
    assert response.json()["food_name"] == "Oats"
    assert response.json()["quantity"] == 1.5
    assert response.json()["calories"] == 225
    assert response.json()["protein"] == 7.5


def test_add_food_to_menu_returns_404_for_unknown_food(client):
    response = client.post(
        "/v1/api/menu/items",
        json={
            "user_id": 1,
            "date": date.today().isoformat(),
            "food_id": 999,
            "quantity": 1,
        },
    )

    assert response.status_code == 404
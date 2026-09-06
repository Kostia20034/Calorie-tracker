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


def test_get_daily_menu_returns_empty_menu_for_date_without_items(client):
    response = client.get(
        "/v1/api/menu",
        params={"user_id": 1, "date": "2026-09-06"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "meal_id": None,
        "date": "2026-09-06",
        "items": [],
        "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    }


def test_get_daily_menu_returns_items_and_totals(client):
    food_response = client.post(
        "/v1/api/foods/manual",
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
        json={
            "user_id": 1,
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 2,
        },
    )

    response = client.get(
        "/v1/api/menu",
        params={"user_id": 1, "date": "2026-09-06"},
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


def test_update_menu_item_changes_quantity_and_nutrition(client):
    food_response = client.post(
        "/v1/api/foods/manual",
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
        json={
            "user_id": 1,
            "date": "2026-09-06",
            "food_id": food_id,
            "quantity": 1,
        },
    )
    item_id = create_response.json()["id"]

    response = client.patch(
        f"/v1/api/menu/items/{item_id}",
        json={"user_id": 1, "quantity": 2.5},
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2.5
    assert response.json()["calories"] == 250
    assert response.json()["protein"] == 25
    assert response.json()["carbs"] == 20
    assert response.json()["fat"] == 5


def test_update_menu_item_returns_404_for_unknown_or_other_user_item(client):
    response = client.patch(
        "/v1/api/menu/items/999",
        json={"user_id": 1, "quantity": 2},
    )

    assert response.status_code == 404


def test_delete_menu_item_removes_item_from_daily_menu(client):
    food_response = client.post(
        "/v1/api/foods/manual",
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
        json={
            "user_id": 1,
            "date": "2026-09-06",
            "food_id": food_response.json()["id"],
            "quantity": 1,
        },
    )
    item_id = create_response.json()["id"]

    response = client.delete(
        f"/v1/api/menu/items/{item_id}",
        params={"user_id": 1},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Menu item deleted successfully",
        "id": item_id,
    }

    menu_response = client.get(
        "/v1/api/menu",
        params={"user_id": 1, "date": "2026-09-06"},
    )
    assert menu_response.json()["items"] == []
    assert menu_response.json()["totals"] == {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
    }


def test_delete_menu_item_returns_404_for_unknown_item(client):
    response = client.delete(
        "/v1/api/menu/items/999",
        params={"user_id": 1},
    )

    assert response.status_code == 404
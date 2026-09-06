# tests/test_foods_endpoint.py
from unittest.mock import MagicMock


def test_post_foods_from_description(client, monkeypatch):
    fake_nutrition = {
        "name": "Apple",
        "calories": 95,
        "protein": 0.5,
        "carbs": 25,
        "fat": 0.3,
        "serving_size_grams": 182,
    }
    monkeypatch.setattr(
        "app.services.food_service.get_nutrition_from_ai",
        MagicMock(return_value=fake_nutrition),
    )

    response = client.post(
        "/v1/api/foods/from-description",
        json={"description": "one apple"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Apple"
    assert body["calories"] == 95
    assert "id" in body


def test_post_foods_manual_entry(client):
    payload = {
        "name": "Banana",
        "calories": 105,
        "protein": 1.3,
        "carbs": 27,
        "fat": 0.3,
        "serving_size_grams": 118,
    }

    response = client.post("/v1/api/foods/manual", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Banana"
    assert body["calories"] == 105
    assert body["serving_size_grams"] == 118
    assert "id" in body


def test_search_foods_by_name(client):
    client.post(
        "/v1/api/foods/manual",
        json={
            "name": "Orange",
            "calories": 62,
            "protein": 1.2,
            "carbs": 15,
            "fat": 0.2,
            "serving_size_grams": 131,
        },
    )

    response = client.get("/v1/api/foods/search", params={"name": "oran"})

    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert any(item["name"] == "Orange" for item in response.json())


def test_update_food_by_id(client):
    create_response = client.post(
        "/v1/api/foods/manual",
        json={
            "name": "Pear",
            "calories": 100,
            "protein": 1.0,
            "carbs": 25,
            "fat": 0.2,
            "serving_size_grams": 150,
        },
    )
    food_id = create_response.json()["id"]

    update_response = client.put(
        f"/v1/api/foods/{food_id}",
        json={
            "name": "Pear",
            "calories": 120,
            "protein": 1.2,
            "carbs": 28,
            "fat": 0.3,
            "serving_size_grams": 170,
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["id"] == food_id
    assert body["calories"] == 120
    assert body["name"] == "Pear"


def test_delete_food_by_id(client):
    create_response = client.post(
        "/v1/api/foods/manual",
        json={
            "name": "Pear",
            "calories": 100,
            "protein": 1.0,
            "carbs": 25,
            "fat": 0.2,
            "serving_size_grams": 150,
        },
    )
    food_id = create_response.json()["id"]

    delete_response = client.delete(f"/v1/api/foods/{food_id}")

    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Food deleted successfully"


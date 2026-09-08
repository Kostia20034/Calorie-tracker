def test_register_login_and_get_current_user(client):
    register_response = client.post(
        "/v1/api/auth/register",
        json={"email": "new@example.com", "password": "password123"},
    )

    assert register_response.status_code == 201
    assert register_response.json()["email"] == "new@example.com"
    assert "password" not in register_response.json()

    login_response = client.post(
        "/v1/api/auth/login",
        data={"username": "new@example.com", "password": "password123"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert login_response.json()["token_type"] == "bearer"

    me_response = client.get(
        "/v1/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "new@example.com"


def test_register_rejects_duplicate_email(client):
    payload = {"email": "duplicate@example.com", "password": "password123"}
    assert client.post("/v1/api/auth/register", json=payload).status_code == 201

    response = client.post("/v1/api/auth/register", json=payload)

    assert response.status_code == 409


def test_login_rejects_wrong_password(client):
    client.post(
        "/v1/api/auth/register",
        json={"email": "wrong@example.com", "password": "password123"},
    )

    response = client.post(
        "/v1/api/auth/login",
        data={"username": "wrong@example.com", "password": "badpassword"},
    )

    assert response.status_code == 401


def test_menu_requires_authentication(client):
    response = client.get("/v1/api/menu", params={"date": "2026-09-06"})

    assert response.status_code == 401
import pytest
#from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db
from app.db.session import Base

TEST_DATABASE_URL = "sqlite:///:memory:" # fake db
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
) #create engine
TestingSessionLocal = sessionmaker(bind=engine) # make session

@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)  # build tables
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)    # delete tables

@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    response = client.post(
        "/v1/api/auth/register",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 201

    login_response = client.post(
        "/v1/api/auth/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
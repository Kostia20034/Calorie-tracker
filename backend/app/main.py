from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.controllers.auth import router as auth_router
from app.api.controllers.foods import router as food_router
from app.api.controllers.menu import router as menu_router
from app.api.controllers.insights import router as insights_router
from app.core.config import settings
from app.db.session import Base, engine
from app.models import meal, user
# from app.storage.s3 import save_file


app = FastAPI(title="Calorie Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:8082"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)  # create tables

if settings.database_url.startswith("sqlite"):
    from sqlalchemy import inspect, text

    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    goal_columns = {
        "calorie_goal": "FLOAT NOT NULL DEFAULT 2000",
        "protein_goal": "FLOAT NOT NULL DEFAULT 120",
        "carbs_goal": "FLOAT NOT NULL DEFAULT 250",
        "fat_goal": "FLOAT NOT NULL DEFAULT 65",
    }
    with engine.begin() as connection:
        for column_name, column_definition in goal_columns.items():
            if column_name not in user_columns:
                connection.execute(
                    text(
                        f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}"
                    )
                )

app.include_router(food_router, prefix="/v1/api")
app.include_router(auth_router, prefix="/v1/api")
app.include_router(menu_router, prefix="/v1/api")
app.include_router(insights_router, prefix="/v1/api")

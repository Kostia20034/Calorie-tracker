from fastapi import FastAPI
from app.models import user, meal, weight_log, mood_log, goal
from app.api.controllers.health import router as health_router
from app.db.session  import Base, engine


app = FastAPI(title="Calorie Tracker API")

Base.metadata.create_all(bind=engine)

app.include_router(health_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Calorie Tracker API is running"}


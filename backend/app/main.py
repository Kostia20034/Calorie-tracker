from fastapi import FastAPI

from app.api.controllers.health import router as health_router


app = FastAPI(title="Calorie Tracker API")

app.include_router(health_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Calorie Tracker API is running"}

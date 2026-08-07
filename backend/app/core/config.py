from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    project_name: str = os.getenv("PROJECT_NAME", "Calorie Tracker API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./calorie_tracker.db")


settings = Settings()

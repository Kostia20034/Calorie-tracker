from dataclasses import dataclass
from dotenv import load_dotenv
import os

load_dotenv()

@dataclass(frozen=True)
class Settings:
    project_name: str = os.getenv("PROJECT_NAME", "Calorie Tracker API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./calorie_tracker.db")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_s3_bucket: str = os.getenv("AWS_S3_BUCKET", "")
    aws_region: str = os.getenv("AWS_REGION", "")
    nvidia_api_key:str = os.getenv("AI_API_KEY","")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    auth_secret_key: str = os.getenv("AUTH_SECRET_KEY", "")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    def __post_init__(self):
        if self.environment != "development" and not self.auth_secret_key:
            raise ValueError("AUTH_SECRET_KEY must be set outside development")


settings = Settings()

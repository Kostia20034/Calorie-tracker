from fastapi import FastAPI, UploadFile, File
from app.models import user, meal
from app.api.controllers.health import router as health_router
from app.db.session  import Base, engine
from app.storage.s3 import save_file 


app = FastAPI(title="Calorie Tracker API")

Base.metadata.create_all(bind=engine)

app.include_router(health_router, prefix="/api")



#from app.models import user, meal
from fastapi import FastAPI
from backend.app.api.controllers.foods import router as food_router
from app.db.session  import Base, engine
# from app.storage.s3 import save_file 


app = FastAPI(title="Calorie Tracker API")

Base.metadata.create_all(bind=engine)

app.include_router(food_router, prefix="/v1/api")



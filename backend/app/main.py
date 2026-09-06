#from app.models import user, meal
from fastapi import FastAPI
from app.api.controllers.foods import router as food_router
from app.api.controllers.menu import router as menu_router
from app.db.session  import Base, engine
from app.models import meal, user
# from app.storage.s3 import save_file 


app = FastAPI(title="Calorie Tracker API")

Base.metadata.create_all(bind=engine) #create tables

app.include_router(food_router, prefix="/v1/api")
app.include_router(menu_router, prefix="/v1/api")



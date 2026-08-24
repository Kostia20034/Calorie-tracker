from fastapi import APIRouter, Depends
from app.db.session import get_db
from sqlalchemy import Session
from app.schemas.food import FoodOut
from app.services.food_service import search_food


router = APIRouter(tags=["foods"], prefix="/foods")


@router.get("/search", response_model=list[FoodOut])
def find_food(q:str,db: Session = Depends(get_db)):
    return search_food(db,q)


  
  

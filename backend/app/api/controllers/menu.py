from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.menu import MenuItemCreate, MenuItemResponse
from app.services.menu_service import add_food_to_menu


router = APIRouter(prefix="/menu", tags=["menu"])


@router.post("/items", response_model=MenuItemResponse, status_code=201)
def add_menu_item(payload: MenuItemCreate, db: Session = Depends(get_db)):
    item = add_food_to_menu(
        db,
        user_id=payload.user_id,
        meal_date=payload.date,
        food_id=payload.food_id,
        quantity=payload.quantity,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food not found")
    return item
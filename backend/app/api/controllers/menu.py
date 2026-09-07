from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.menu import (
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
    MenuResponse,
)
from app.services.menu_service import (
    add_food_to_menu,
    delete_menu_item,
    get_daily_menu,
    update_menu_item,
)


router = APIRouter(prefix="/menu", tags=["menu"])


@router.get("", response_model=MenuResponse)
def get_menu(
    date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_daily_menu(db, user_id=current_user.id, meal_date=date)


@router.post("/items", response_model=MenuItemResponse, status_code=201)
def add_menu_item(
    payload: MenuItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = add_food_to_menu(
        db,
        user_id=current_user.id,
        meal_date=payload.date,
        food_id=payload.food_id,
        quantity=payload.quantity,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food not found")
    return item


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
def update_menu_item_route(
    item_id: int,
    payload: MenuItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = update_menu_item(
        db,
        item_id=item_id,
        user_id=current_user.id,
        quantity=payload.quantity,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.delete("/items/{item_id}")
def delete_menu_item_route(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_menu_item(db, item_id=item_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully", "id": item_id}
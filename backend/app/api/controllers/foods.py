from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.food import FoodDescriptionRequest, FoodManualEntryRequest, FoodResponse, FoodUpdateRequest
from app.services.food_service import (
    create_food_from_description,
    create_manual_food,
    delete_food_by_id,
    search_foods_by_name,
    update_food_by_id,
)

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/search", response_model=list[FoodResponse])
def search_foods(
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    foods = search_foods_by_name(db, name)
    return foods


@router.post("/from-description", response_model=FoodResponse, status_code=201)
def add_food_from_description(
    payload: FoodDescriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = create_food_from_description(db, payload.description)
    return food


@router.post("/manual", response_model=FoodResponse, status_code=201)
def add_food_manual(
    payload: FoodManualEntryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = create_manual_food(db, payload.model_dump())
    return food


@router.put("/{food_id}", response_model=FoodResponse)
def update_food_route(
    food_id: int,
    payload: FoodUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = update_food_by_id(db, food_id, payload.model_dump())
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return food


@router.delete("/{food_id}")
def delete_food_by_id_route(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_food_by_id(db, food_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Food not found")
    return {"message": "Food deleted successfully", "id": food_id}




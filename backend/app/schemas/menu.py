from datetime import date

from pydantic import BaseModel, Field


class MenuItemCreate(BaseModel):
    user_id: int
    date: date
    food_id: int
    quantity: float = Field(gt=0)


class MenuItemResponse(BaseModel):
    id: int
    meal_id: int
    food_id: int
    quantity: float
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float

    class Config:
        from_attributes = True
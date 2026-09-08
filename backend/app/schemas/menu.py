from datetime import date

from pydantic import BaseModel, Field

from app.models.meal import MealCategory


class MenuItemCreate(BaseModel):
    date: date
    food_id: int
    quantity: float = Field(gt=0)


class MenuItemUpdate(BaseModel):
    quantity: float = Field(gt=0)


class MenuItemResponse(BaseModel):
    id: int
    meal_id: int
    food_id: int
    category: MealCategory
    quantity: float
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float

    class Config:
        from_attributes = True


class MenuTotals(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float


class MenuResponse(BaseModel):
    meal_id: int | None
    date: date
    items: list[MenuItemResponse]
    totals: MenuTotals
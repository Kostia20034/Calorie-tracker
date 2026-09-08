from datetime import date

from pydantic import BaseModel, Field

from app.schemas.menu import MenuItemResponse, MenuTotals


class DetectedFood(BaseModel):
    name: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    portion_description: str = Field(min_length=1)
    estimated_calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class DetectedFoodResponse(BaseModel):
    items: list[DetectedFood]
    total_calories: float = Field(ge=0)


class ImageMealResponse(BaseModel):
    image_id: int
    image_key: str
    meal_id: int
    date: date
    items: list[MenuItemResponse]
    totals: MenuTotals
from pydantic import BaseModel


class FoodDescriptionRequest(BaseModel):
    description: str


class FoodManualEntryRequest(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    serving_size_grams: float


class FoodUpdateRequest(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    serving_size_grams: float


class FoodResponse(BaseModel):
    id: int
    name: str
    calories: float
    protein: float
    fat: float
    carbs: float
    serving_size_grams: float

    class Config:
        from_attributes = True  # lets Pydantic read straight from your SQLAlchemy model
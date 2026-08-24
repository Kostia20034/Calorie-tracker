from pydantic import BaseModel
class FoodOut(BaseModel):
  id: int
  name : str
  grams: float
  callories: int
  protein: int
  carbs: int
  fats: int
  
  class Config:
    from_attributes = True
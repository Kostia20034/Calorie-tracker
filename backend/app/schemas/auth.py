from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: int
    email: str
    calorie_goal: float
    protein_goal: float
    carbs_goal: float
    fat_goal: float

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class GoalUpdateRequest(BaseModel):
    calorie_goal: float = Field(gt=0, le=10000)
    protein_goal: float = Field(gt=0, le=1000)
    carbs_goal: float = Field(gt=0, le=2000)
    fat_goal: float = Field(gt=0, le=500)

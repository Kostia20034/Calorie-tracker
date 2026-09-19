from datetime import date

from pydantic import BaseModel


class DailyInsight(BaseModel):
    date: date
    calories: float
    protein: float
    carbs: float
    fat: float


class InsightsResponse(BaseModel):
    start_date: date
    end_date: date
    logged_days: int
    average_calories: float
    average_protein: float
    average_carbs: float
    average_fat: float
    days: list[DailyInsight]

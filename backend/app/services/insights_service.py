from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.meal import Meal


INSIGHT_WINDOW_DAYS = 7


def get_insights(db: Session, user_id: int, end_date: date) -> dict:
    start_date = end_date - timedelta(days=INSIGHT_WINDOW_DAYS - 1)
    meals = (
        db.query(Meal)
        .filter(
            Meal.user_id == user_id,
            Meal.meal_date >= start_date,
            Meal.meal_date <= end_date,
        )
        .all()
    )
    meals_by_date = {meal.meal_date: meal for meal in meals}
    daily_insights = []

    for offset in range(INSIGHT_WINDOW_DAYS):
        insight_date = start_date + timedelta(days=offset)
        items = (
            meals_by_date.get(insight_date).items
            if insight_date in meals_by_date
            else []
        )
        daily_insights.append(
            {
                "date": insight_date,
                "calories": sum(item.calories for item in items),
                "protein": sum(item.protein for item in items),
                "carbs": sum(item.carbs for item in items),
                "fat": sum(item.fat for item in items),
            }
        )

    logged_days = sum(1 for day in daily_insights if day["calories"] > 0)
    divisor = logged_days or 1
    return {
        "start_date": start_date,
        "end_date": end_date,
        "logged_days": logged_days,
        "average_calories": sum(day["calories"] for day in daily_insights) / divisor,
        "average_protein": sum(day["protein"] for day in daily_insights) / divisor,
        "average_carbs": sum(day["carbs"] for day in daily_insights) / divisor,
        "average_fat": sum(day["fat"] for day in daily_insights) / divisor,
        "days": daily_insights,
    }

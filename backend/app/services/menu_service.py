from datetime import date

from sqlalchemy.orm import Session

from app.models.meal import Food, Meal, MealItem


def add_food_to_menu(
    db: Session, user_id: int, meal_date: date, food_id: int, quantity: float
) -> MealItem | None:
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        return None

    meal = (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.meal_date == meal_date)
        .first()
    )
    if not meal:
        meal = Meal(user_id=user_id, meal_date=meal_date)
        db.add(meal)
        db.flush()

    item = MealItem(
        meal_id=meal.id,
        food_id=food.id,
        quantity=quantity,
        food_name=food.name,
        calories=food.calories * quantity,
        protein=(food.protein or 0) * quantity,
        carbs=(food.carbs or 0) * quantity,
        fat=(food.fat or 0) * quantity,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
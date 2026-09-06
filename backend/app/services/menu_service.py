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


def get_daily_menu(db: Session, user_id: int, meal_date: date) -> dict:
    meal = (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.meal_date == meal_date)
        .first()
    )
    items = meal.items if meal else []

    return {
        "meal_id": meal.id if meal else None,
        "date": meal_date,
        "items": items,
        "totals": {
            "calories": sum(item.calories for item in items),
            "protein": sum(item.protein for item in items),
            "carbs": sum(item.carbs for item in items),
            "fat": sum(item.fat for item in items),
        },
    }


def update_menu_item(
    db: Session, item_id: int, user_id: int, quantity: float
) -> MealItem | None:
    item = (
        db.query(MealItem)
        .join(Meal)
        .filter(MealItem.id == item_id, Meal.user_id == user_id)
        .first()
    )
    if not item:
        return None

    item.quantity = quantity
    item.calories = item.food.calories * quantity
    item.protein = (item.food.protein or 0) * quantity
    item.carbs = (item.food.carbs or 0) * quantity
    item.fat = (item.food.fat or 0) * quantity

    db.commit()
    db.refresh(item)
    return item


def delete_menu_item(db: Session, item_id: int, user_id: int) -> bool:
    item = (
        db.query(MealItem)
        .join(Meal)
        .filter(MealItem.id == item_id, Meal.user_id == user_id)
        .first()
    )
    if not item:
        return False

    db.delete(item)
    db.commit()
    return True
from app.ai.nutrition_ai import get_nutrition_from_ai
from app.models.meal import Food


def create_food_from_description(db: Session, description: str) -> Food:
    nutrition = get_nutrition_from_ai(description)

    food = Food(
        name=nutrition["name"],
        calories=nutrition["calories"],
        protein=nutrition["protein"],
        fat=nutrition["fat"],
        carbs=nutrition["carbs"],
        serving_size_grams=nutrition["serving_size_grams"],
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


def create_manual_food(db: Session, payload: dict) -> Food:
    food = Food(
        name=payload["name"],
        calories=payload["calories"],
        protein=payload["protein"],
        fat=payload["fat"],
        carbs=payload["carbs"],
        serving_size_grams=payload["serving_size_grams"],
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


def search_foods_by_name(db: Session, name: str):
    return db.query(Food).filter(Food.name.ilike(f"%{name}%")).all()


def update_food_by_id(db: Session, food_id: int, payload: dict) -> Food | None:
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        return None

    food.name = payload["name"]
    food.calories = payload["calories"]
    food.protein = payload["protein"]
    food.carbs = payload["carbs"]
    food.fat = payload["fat"]
    food.serving_size_grams = payload["serving_size_grams"]

    db.commit()
    db.refresh(food)
    return food


def delete_food_by_id(db: Session, food_id: int) -> bool:
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        return False
    db.delete(food)
    db.commit()
    return True



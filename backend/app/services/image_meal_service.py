from datetime import date, datetime

from sqlalchemy.orm import Session

from app.ai.food_image_ai import analyze_food_image
from app.models.meal import Food, Meal, MealImage, MealItem
from app.schemas.image_meal import DetectedFoodResponse
from app.storage.s3 import saveFile
from app.services.menu_service import get_meal_category


def add_image_meal_to_menu(
    db: Session,
    user_id: int,
    meal_date: date,
    image_bytes: bytes,
    file_name: str,
    content_type: str,
) -> dict:
    image_key = saveFile(image_bytes, file_name, content_type)
    analysis: DetectedFoodResponse = analyze_food_image(image_bytes, content_type)

    meal = (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.meal_date == meal_date)
        .first()
    )
    if not meal:
        meal = Meal(user_id=user_id, meal_date=meal_date)
        db.add(meal)
        db.flush()
    meal.image_key = image_key
    image = MealImage(meal_id=meal.id, s3_key=image_key)
    db.add(image)
    db.flush()
    category = get_meal_category(datetime.now().time())
    created_items = []

    for detected in analysis.items:
        calories_per_quantity = detected.estimated_calories / detected.quantity
        protein_per_quantity = detected.protein_g / detected.quantity
        carbs_per_quantity = detected.carbs_g / detected.quantity
        fat_per_quantity = detected.fat_g / detected.quantity
        food = Food(
            name=detected.name,
            calories=calories_per_quantity,
            protein=protein_per_quantity,
            carbs=carbs_per_quantity,
            fat=fat_per_quantity,
            serving_size_grams=1,
        )
        db.add(food)
        db.flush()
        item = MealItem(
            meal_id=meal.id,
            food_id=food.id,
            category=category,
            quantity=detected.quantity,
            food_name=detected.name,
            calories=detected.estimated_calories,
            protein=detected.protein_g,
            carbs=detected.carbs_g,
            fat=detected.fat_g,
        )
        db.add(item)
        created_items.append(item)

    db.commit()
    db.refresh(image)
    for item in created_items:
        db.refresh(item)
    return {
        "image_id": image.id,
        "image_key": image.s3_key,
        "meal_id": meal.id,
        "date": meal_date,
        "items": created_items,
        "totals": {
            "calories": sum(item.calories for item in created_items),
            "protein": sum(item.protein for item in created_items),
            "carbs": sum(item.carbs for item in created_items),
            "fat": sum(item.fat for item in created_items),
        },
    }
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="draft")  # draft, confirmed
    meal_type = Column(String, nullable=True)  # breakfast, lunch, dinner, snack
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="meals")
    items = relationship("MealItem", back_populates="meal")

class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_name = Column(String, nullable=False)
    grams = Column(Float, nullable=False)
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)

    meal = relationship("Meal", back_populates="items")
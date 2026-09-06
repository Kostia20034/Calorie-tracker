from datetime import date

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Food(Base):
    __tablename__ = "foods"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    calories = Column(Float, nullable=False)
    serving_size_grams = Column(Float, nullable=False)
    carbs = Column(Float)
    protein = Column(Float)
    fat = Column(Float)

class Meal(Base):
    __tablename__ = "meals"
    __table_args__ = (UniqueConstraint("user_id", "meal_date", name="uq_meals_user_date"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    image_key = Column(String, nullable=True)

    items = relationship("MealItem", back_populates="meal")
    user =  relationship("User", back_populates="meals")

class MealItem(Base):
    __tablename__ = "meal_items"
    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    food_name = Column(String, nullable=False)
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)

    meal = relationship("Meal", back_populates="items")
    food = relationship("Food")
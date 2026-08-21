from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
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
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    image_key = Column(String, nullable=True)

    items = relationship("MealItem", back_populates="meal")
    user =  relationship("User", back_populates="meals")

class MealItem(Base):
    __tablename__ = "meal_items"
    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id"), nullable=False)
    quantity = Column(Integer, nullable=False)   # how many units of the food

    meal = relationship("Meal", back_populates="items")
    food = relationship("Food")
from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    password = Column(String, nullable=False)
    calorie_goal = Column(Float, nullable=False, default=2000)
    protein_goal = Column(Float, nullable=False, default=120)
    carbs_goal = Column(Float, nullable=False, default=250)
    fat_goal = Column(Float, nullable=False, default=65)

    meals = relationship("Meal", back_populates="user")

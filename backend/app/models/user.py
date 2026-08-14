from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meals = relationship("Meal", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    mood_logs = relationship("MoodLog", back_populates="user")
    goals = relationship("GoalSettings", back_populates="user")
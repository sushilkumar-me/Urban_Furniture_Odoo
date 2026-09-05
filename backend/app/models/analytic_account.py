from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class AnalyticAccount(Base):
    __tablename__ = "analytic_accounts"

    id            = Column(Integer, primary_key=True, index=True)
    analytic_name = Column(String(120), nullable=False)
    type          = Column(String(50), nullable=True)
    description   = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=func.now())

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Account(Base):
    __tablename__ = "chart_of_accounts"

    id           = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(120), unique=True, nullable=False, index=True)
    account_type = Column(String(50), nullable=False)
    created_at   = Column(DateTime, default=func.now())

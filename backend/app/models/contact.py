from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Contact(Base):
    __tablename__ = "contacts"

    id           = Column(Integer, primary_key=True, index=True)
    contact_type = Column(String(20), nullable=False)
    name         = Column(String(120), nullable=False)
    email        = Column(String(150), unique=True, nullable=True)
    phone        = Column(String(20), nullable=True)
    address      = Column(Text, nullable=True)
    city         = Column(String(50), nullable=True)
    state        = Column(String(50), nullable=True)
    country      = Column(String(50), nullable=True)
    pincode      = Column(String(10), nullable=True)
    image        = Column(String(255), nullable=True)
    created_at   = Column(DateTime, default=func.now())

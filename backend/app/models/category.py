from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Category(Base):

    # Maps to the "categories" table in PostgreSQL
    __tablename__ = "categories"

    # id: auto-generated integer primary key
    # Every row gets a unique id automatically
    id = Column(Integer, primary_key=True, index=True)

    # category_name: required, max 100 characters, must be unique
    # unique=True → no two categories can have the same name
    # This matches the UNIQUE CONSTRAINT in PostgreSQL
    # index=True → we often search by name, index makes it faster
    category_name = Column(String(100), unique=True, nullable=False, index=True)

    # description: optional, no length limit
    # Text type = PostgreSQL TEXT (unlimited length)
    # nullable=True → category can exist without a description
    description = Column(Text, nullable=True)

    # created_at: automatically set to current timestamp when inserted
    # default=func.now() is the SQLAlchemy equivalent of
    # DEFAULT CURRENT_TIMESTAMP in PostgreSQL
    created_at = Column(DateTime, default=func.now())

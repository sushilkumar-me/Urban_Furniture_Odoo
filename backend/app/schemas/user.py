from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    login_id: str
    email: EmailStr
    password: str
    role: str

class UserLogin(BaseModel):
    login_id: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    login_id: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

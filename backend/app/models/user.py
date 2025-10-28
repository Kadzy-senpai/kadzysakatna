from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str
    role: str = Field(..., pattern="^(passenger|driver|admin)$")

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None

class UserOut(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    phone_number: str
    role: str
    created_at: Optional[datetime] = None

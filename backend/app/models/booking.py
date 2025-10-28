from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BookingCreate(BaseModel):
    user_id: str
    pickup_location: str
    dropoff_location: str
    fare: float
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None

class BookingUpdate(BaseModel):
    status: Optional[str]  # requested, accepted, ongoing, completed, cancelled

class BookingOut(BaseModel):
    booking_id: str
    user_id: str
    pickup_location: str
    dropoff_location: str
    fare: float
    status: str
    created_at: Optional[datetime] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None

from pydantic import BaseModel, Field
from datetime import datetime

class TransactionCreate(BaseModel):
    booking_id: str
    user_id: str
    driver_id: str
    payment_mode: str = Field(..., pattern="^(cash|online)$")
    amount: float

class TransactionResponse(BaseModel):
    transaction_id: str
    booking_id: str
    user_id: str
    driver_id: str
    payment_mode: str
    payment_status: str
    amount: float
    created_at: datetime

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: Optional[str] = "info"


class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: Optional[datetime] = None

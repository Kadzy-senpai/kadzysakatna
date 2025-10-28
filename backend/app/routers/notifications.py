from fastapi import APIRouter
from fastapi import HTTPException
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/user/{user_id}")
def get_notifications(user_id: str):
    try:
        notifs = NotificationService.get_user_notifications(user_id)
        return notifs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{notification_id}/read")
def mark_as_read(notification_id: str):
    try:
        res = NotificationService.mark_read(notification_id)
        if not res:
            raise HTTPException(status_code=404, detail="Notification not found")
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

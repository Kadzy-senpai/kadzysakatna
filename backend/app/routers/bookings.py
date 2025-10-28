from fastapi import APIRouter, HTTPException
from app.models.booking import BookingCreate, BookingOut
from app.services.booking_service import BookingService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingOut)
def create_booking(payload: BookingCreate):
    b = BookingService.create_booking(payload)
    return b

@router.get("/{booking_id}")
def get_booking(booking_id: str):
    b = BookingService.get_booking(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b

@router.get("")
def list_bookings(skip: int = 0, limit: int = 100):
    return BookingService.list_bookings(skip=skip, limit=limit)


@router.get("/status/{status}")
def list_bookings_by_status(status: str):
    return BookingService.list_bookings_by_status(status)


@router.get("/driver/{driver_id}")
def list_bookings_for_driver(driver_id: str):
    return BookingService.list_bookings_for_driver(driver_id)

@router.post("/{booking_id}/assign/{driver_id}")
def assign_driver(booking_id: str, driver_id: str):
    booking = BookingService.assign_driver(booking_id, driver_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # create a notification for the passenger
    try:
        NotificationService.create_notification(
            booking.get("user_id"),
            "Driver Assigned",
            f"Your ride has been accepted by driver {driver_id}.",
            type="booking",
        )
    except Exception:
        # don't fail the request if notification creation errors out
        pass

    return {"message": "Driver assigned", "booking": booking}

@router.post("/{booking_id}/complete")
def complete_booking(booking_id: str):
    BookingService.complete_booking(booking_id)
    return {"message": "Booking completed"}


@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: str):
    b = BookingService.cancel_booking(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking cancelled", "booking": b}

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from uuid import uuid4
from app.db.neo4j_driver import get_driver

router = APIRouter(prefix="/drivers", tags=["drivers"])

class DriverCreate(BaseModel):
    user_id: str
    license_number: str
    vehicle_plate: str | None = None
    availability_status: str | None = "offline"

@router.post("")
def create_driver(payload: DriverCreate):
    driver_id = str(uuid4())
    driver = get_driver()
    with driver.session() as session:
        session.run("""
        MATCH (u:User {user_id:$user_id})
        CREATE (d:Driver {driver_id:$driver_id, license_number:$license_number,
                          vehicle_plate:$vehicle_plate, availability_status:$availability_status, rating:0.0})
        CREATE (u)-[:IS_DRIVER]->(d)
        """, user_id=payload.user_id, driver_id=driver_id,
        license_number=payload.license_number, vehicle_plate=payload.vehicle_plate,
        availability_status=payload.availability_status)
    return {"driver_id": driver_id}

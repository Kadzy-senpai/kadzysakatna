from app.db.neo4j_driver import get_driver, close_driver
import logging
from neo4j import exceptions as neo4j_exceptions
from uuid import uuid4
from datetime import datetime


def _normalize_props(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        try:
            if v is None:
                out[k] = None
                continue
            if hasattr(v, "to_native") and callable(getattr(v, "to_native")):
                out[k] = v.to_native()
                continue
            if hasattr(v, "year") and hasattr(v, "month") and hasattr(v, "day"):
                try:
                    hour = getattr(v, "hour", 0)
                    minute = getattr(v, "minute", 0)
                    second = getattr(v, "second", 0)
                    nanosecond = getattr(v, "nanosecond", 0)
                    microsecond = int(nanosecond / 1000) if nanosecond else 0
                    out[k] = datetime(int(v.year), int(v.month), int(v.day), int(hour), int(minute), int(second), microsecond)
                    continue
                except Exception:
                    pass
        except Exception:
            pass
        out[k] = v
    return out

class BookingService:
    @staticmethod
    def create_booking(data):
        booking_id = str(uuid4())
        created_at = datetime.utcnow().isoformat()
        query = """
        MATCH (u:User {user_id:$user_id})
        CREATE (b:Booking {
            booking_id:$booking_id, user_id:$user_id,
            pickup_location:$pickup_location, dropoff_location:$dropoff_location,
            pickup_lat:$pickup_lat, pickup_lng:$pickup_lng,
            dropoff_lat:$dropoff_lat, dropoff_lng:$dropoff_lng,
            fare:$fare, status:'requested', created_at: datetime($created_at)
        })
        CREATE (u)-[:REQUESTED]->(b)
        RETURN b
        """
        driver = get_driver()
        with driver.session() as session:
            res = session.run(query, {
                "booking_id": booking_id,
                "user_id": data.user_id,
                "pickup_location": data.pickup_location,
                "dropoff_location": data.dropoff_location,
                "pickup_lat": getattr(data, "pickup_lat", None),
                "pickup_lng": getattr(data, "pickup_lng", None),
                "dropoff_lat": getattr(data, "dropoff_lat", None),
                "dropoff_lng": getattr(data, "dropoff_lng", None),
                "fare": data.fare,
                "created_at": created_at
            }).single()
            props = dict(res["b"]) if res else None
            return _normalize_props(props) if props else None

    @staticmethod
    def get_booking(booking_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (b:Booking {booking_id:$booking_id}) RETURN b LIMIT 1", booking_id=booking_id).single()
            if not res:
                return None
            return _normalize_props(dict(res["b"]))

    @staticmethod
    def list_bookings(skip=0, limit=100):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (b:Booking) RETURN b SKIP $skip LIMIT $limit", skip=skip, limit=limit)
            out = []
            for r in res:
                props = dict(r["b"]) if r and r.get("b") is not None else {}
                out.append(_normalize_props(props))
            return out

    @staticmethod
    def list_bookings_by_status(status: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (b:Booking {status:$status}) RETURN b ORDER BY b.created_at DESC", status=status)
            out = []
            for r in res:
                props = dict(r["b"]) if r and r.get("b") is not None else {}
                out.append(_normalize_props(props))
            return out

    @staticmethod
    def list_bookings_for_driver(driver_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (d:Driver {driver_id:$driver_id})-[:ACCEPTED]->(b:Booking) RETURN b ORDER BY b.created_at DESC", driver_id=driver_id)
            out = []
            for r in res:
                props = dict(r["b"]) if r and r.get("b") is not None else {}
                out.append(_normalize_props(props))
            return out

    @staticmethod
    def assign_driver(booking_id: str, driver_id: str):
        driver = get_driver()
        with driver.session() as session:
            # ensure a Driver node exists, create relationship, and set booking status/assigned time
            assigned_at = datetime.utcnow().isoformat()
            session.run("""
            MERGE (d:Driver {driver_id:$driver_id})
            WITH d
            MATCH (b:Booking {booking_id:$booking_id})
            MERGE (d)-[:ACCEPTED]->(b)
            SET b.status='accepted', b.assigned_at = datetime($assigned_at)
            """, booking_id=booking_id, driver_id=driver_id, assigned_at=assigned_at)
            # return the booking props so callers can notify passenger
            res = session.run("MATCH (b:Booking {booking_id:$booking_id}) RETURN b LIMIT 1", booking_id=booking_id).single()
            if not res:
                return None
            return _normalize_props(dict(res["b"]))

    @staticmethod
    def complete_booking(booking_id: str):
        driver = get_driver()
        completed_at = datetime.utcnow().isoformat()
        try:
            with driver.session() as session:
                session.run("""
                MATCH (b:Booking {booking_id:$booking_id})
                SET b.status='completed', b.completed_at = datetime($completed_at)
                """, booking_id=booking_id, completed_at=completed_at)
                return True
        except neo4j_exceptions.ServiceUnavailable as e:
            # Attempt one recovery: close and re-init the driver, then retry once
            logging.warning("Neo4j ServiceUnavailable during complete_booking, attempting driver refresh: %s", e)
            try:
                close_driver()
            except Exception:
                pass
            # re-acquire driver and retry
            driver = get_driver()
            try:
                with driver.session() as session:
                    session.run("""
                    MATCH (b:Booking {booking_id:$booking_id})
                    SET b.status='completed', b.completed_at = datetime($completed_at)
                    """, booking_id=booking_id, completed_at=completed_at)
                    return True
            except Exception as e2:
                logging.error("Retry after driver refresh failed: %s", e2)
                raise

    @staticmethod
    def cancel_booking(booking_id: str):
        driver = get_driver()
        with driver.session() as session:
            # Find the booking and its user for possible notification or return
            res = session.run("MATCH (b:Booking {booking_id:$booking_id}) RETURN b LIMIT 1", booking_id=booking_id).single()
            if not res:
                return None
            booking_props = _normalize_props(dict(res["b"]))
            # Delete the booking and all relationships
            session.run("""
                MATCH (b:Booking {booking_id:$booking_id})
                DETACH DELETE b
            """, booking_id=booking_id)
            return booking_props

from app.db.neo4j_driver import get_driver
from uuid import uuid4
from datetime import datetime
from app.utils.hashing import hash_password


def _normalize_props(d: dict) -> dict:
    """Convert Neo4j temporal types to python native datetimes when possible."""
    out = {}
    for k, v in d.items():
        try:
            if v is None:
                out[k] = None
                continue
            # neo4j.time.DateTime has to_native()
            if hasattr(v, "to_native") and callable(getattr(v, "to_native")):
                nv = v.to_native()
                out[k] = nv
                continue
            # fallback: if it looks like a date/time-like object, build datetime
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

class UserService:
    @staticmethod
    def get_user(user_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (u:User {user_id:$user_id}) RETURN u LIMIT 1", user_id=user_id).single()
            if not res:
                return None
            props = dict(res["u"]) or {}
            return _normalize_props(props)

    @staticmethod
    def list_users(skip: int = 0, limit: int = 100):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (u:User) RETURN u SKIP $skip LIMIT $limit", skip=skip, limit=limit)
            out = []
            for r in res:
                props = dict(r["u"]) if r and r.get("u") is not None else {}
                out.append(_normalize_props(props))
            return out

    @staticmethod
    def update_user(user_id: str, props: dict):
        if "password" in props:
            props["password_hash"] = hash_password(props.pop("password"))
        if not props:
            return False
        set_clause = ", ".join([f"u.{k} = ${k}" for k in props.keys()])
        params = {"user_id": user_id, **props}
        q = f"MATCH (u:User {{user_id:$user_id}}) SET {set_clause} RETURN u"
        driver = get_driver()
        with driver.session() as session:
            session.run(q, **params)
        return True

    @staticmethod
    def delete_user(user_id: str):
        driver = get_driver()
        with driver.session() as session:
            session.run("MATCH (u:User {user_id:$user_id}) DETACH DELETE u", user_id=user_id)
        return True

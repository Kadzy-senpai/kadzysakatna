from app.db.neo4j_driver import get_driver
from uuid import uuid4
from datetime import datetime


class NotificationService:
    @staticmethod
    def create_notification(user_id: str, title: str, message: str, type: str = "info"):
        nid = str(uuid4())
        created_at = datetime.utcnow().isoformat()
        q = """
        MATCH (u:User {user_id:$user_id})
        CREATE (n:Notification {
            notification_id:$nid,
            user_id:$user_id,
            title:$title,
            message:$message,
            type:$type,
            read:false,
            created_at: datetime($created_at)
        })
        MERGE (u)-[:HAS_NOTIFICATION]->(n)
        RETURN n
        """
        driver = get_driver()
        with driver.session() as session:
            res = session.run(q, nid=nid, user_id=user_id, title=title, message=message, type=type, created_at=created_at).single()
            if not res:
                return None
            return dict(res["n"]) if res and res.get("n") is not None else None

    @staticmethod
    def get_user_notifications(user_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (u:User {user_id:$user_id})-[:HAS_NOTIFICATION]->(n:Notification)
            RETURN n ORDER BY n.created_at DESC
            """, user_id=user_id)
            out = []
            for r in res:
                n = dict(r["n"]) if r and r.get("n") is not None else {}
                out.append(n)
            return out

    @staticmethod
    def mark_read(notification_id: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("""
            MATCH (n:Notification {notification_id:$nid})
            SET n.read = true
            RETURN n
            """, nid=notification_id).single()
            if not res:
                return None
            return dict(res["n"]) if res and res.get("n") is not None else None

from app.db.neo4j_driver import get_driver
from app.utils.hashing import hash_password, verify_password
from app.utils.auth import create_access_token
from uuid import uuid4
from datetime import datetime

class AuthService:
    @staticmethod
    def register(data):
        user_id = str(uuid4())
        created_at = datetime.utcnow().isoformat()
        hashed = hash_password(data.password)
        query = """
        CREATE (u:User {
            user_id: $user_id, name: $name, email: $email,
            phone_number: $phone_number, password_hash: $password_hash,
            role: $role, created_at: datetime($created_at)
        })
        RETURN u
        """
        driver = get_driver()
        with driver.session() as session:
            session.run(query, {
                "user_id": user_id,
                "name": data.name,
                "email": data.email,
                "phone_number": data.phone_number,
                "password_hash": hashed,
                "role": data.role,
                "created_at": created_at
            })
        return {"user_id": user_id}

    @staticmethod
    def login(email: str, password: str):
        driver = get_driver()
        with driver.session() as session:
            res = session.run("MATCH (u:User {email:$email}) RETURN u LIMIT 1", email=email).single()
            if not res:
                return None
            user = dict(res["u"])
            if "password_hash" not in user:
                return None
            if not verify_password(password, user["password_hash"]):
                return None
            token = create_access_token(user["user_id"])
            # remove sensitive
            user.pop("password_hash", None)
            return {"access_token": token, "user": user}

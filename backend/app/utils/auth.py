import os
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv

load_dotenv()
SECRET = os.getenv("JWT_SECRET", "replace-me")
EXP_MIN = int(os.getenv("JWT_EXP_MINUTES", "60"))

def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EXP_MIN)
    payload = {"sub": subject, "exp": expire.isoformat()}
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    return token

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise
    except Exception:
        raise

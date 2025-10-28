from fastapi import APIRouter, HTTPException
from app.models.user import UserCreate
from app.services.auth_service import AuthService
from fastapi import Body

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(payload: UserCreate):
    try:
        return AuthService.register(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(payload: dict = Body(...)):
    # payload should have email and password
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    auth = AuthService.login(email, password)
    if not auth:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return auth

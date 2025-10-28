from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    u = UserService.get_user(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.pop("password_hash", None)
    return u

@router.get("", response_model=list[UserOut])
def list_users(skip: int = 0, limit: int = 100):
    users = UserService.list_users(skip=skip, limit=limit)
    for u in users:
        u.pop("password_hash", None)
    return users

@router.patch("/{user_id}")
def update_user(user_id: str, payload: UserUpdate):
    props = payload.model_dump(exclude_none=True)
    if not props:
        raise HTTPException(status_code=400, detail="No fields to update")
    UserService.update_user(user_id, props)
    return {"message": "User updated"}

@router.delete("/{user_id}")
def delete_user(user_id: str):
    UserService.delete_user(user_id)
    return {"message": "User deleted"}

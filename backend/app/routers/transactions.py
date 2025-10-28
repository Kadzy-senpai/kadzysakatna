from fastapi import APIRouter, HTTPException
from app.models.transaction import TransactionCreate, TransactionResponse
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("", response_model=TransactionResponse)
def create_transaction(payload: TransactionCreate):
    try:
        t = TransactionService.create_transaction(payload)
        # t is dict of created transaction
        # convert created_at to ISO str if Neo4j returns datetime object; keep as-is for now
        return t
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{transaction_id}/confirm")
def confirm_cash(transaction_id: str):
    try:
        return TransactionService.confirm_cash_payment(transaction_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/{user_id}")
def get_user_transactions(user_id: str):
    return TransactionService.get_user_transactions(user_id)

@router.get("/driver/{driver_id}")
def get_driver_transactions(driver_id: str):
    return TransactionService.get_driver_transactions(driver_id)

@router.get("/daily/{date}")
def get_daily_total(date: str):
    return TransactionService.get_daily_total(date)

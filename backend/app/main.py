from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, drivers, bookings, transactions, ratings, notifications
from app.db.neo4j_driver import init_driver, close_driver
import os

app = FastAPI(title="TRICY - Tricycle Transport API")

# Configure CORS so the frontend dev server (and production frontends) can talk to this API.
FRONTEND_ORIGINS = [o.strip() for o in os.getenv("FRONTEND_URLS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(drivers.router)
app.include_router(bookings.router)
app.include_router(transactions.router)
app.include_router(ratings.router)
app.include_router(notifications.router)

@app.on_event("startup")
def on_startup():
    init_driver()

@app.on_event("shutdown")
def on_shutdown():
    close_driver()

@app.get("/")
def root():
    return {"message": "TRICY API running 🚴‍♂️"}

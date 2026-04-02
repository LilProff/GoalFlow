from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import ryna, sync

app = FastAPI(
    title="GoalFlow API",
    version="2.0.0",
    description="Backend for GoalFlow — AI PA, cloud sync",
)

# CORS — allow the Vite dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://goalflow.app",       # update when you deploy frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(ryna.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "goalflow-api"}


@app.get("/")
async def root() -> dict:
    return {"service": "GoalFlow API", "version": "2.0.0", "docs": "/docs"}

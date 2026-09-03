from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import (
    auth, daily, tasks, pillars, user, ryna, onboarding,
    analytics, goals, planner, leaderboard, notifications,
    projects, life_structure,
)

app = FastAPI(
    title="GoalFlow API",
    description="Backend for GoalFlow — AI-powered productivity & life OS",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Origins come from config (ALLOWED_ORIGINS in .env) so a deployment can permit
# its real domain without a code change. Hardcoding localhost here meant the
# deployed frontend would have been blocked by the browser on day one.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "healthy", "service": "goalflow-api", "version": "1.0.0"}


# ── API v1 ────────────────────────────────────────────────────────────────────
from fastapi import APIRouter

api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(auth.router)
api_v1.include_router(user.router)
api_v1.include_router(onboarding.router)
api_v1.include_router(pillars.router)
api_v1.include_router(goals.router)
api_v1.include_router(tasks.router)
api_v1.include_router(daily.router)
api_v1.include_router(planner.router)
api_v1.include_router(analytics.router)
api_v1.include_router(ryna.router)
api_v1.include_router(leaderboard.router)
api_v1.include_router(notifications.router)
api_v1.include_router(projects.router)
api_v1.include_router(projects.routine_router)
api_v1.include_router(projects.planning_router)
api_v1.include_router(life_structure.router)

app.include_router(api_v1)

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints import admin, announcements, auth, projects, public, users
from app.core.deps import get_db
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health/live", response_model=HealthResponse, tags=["health"])
def live_health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/health/ready", response_model=HealthResponse, tags=["health"])
async def ready_health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    await db.execute(text("SELECT 1"))
    return HealthResponse(status="ok")


router.include_router(auth.router)
router.include_router(users.router)
router.include_router(public.router)
router.include_router(projects.router)
router.include_router(announcements.router)
router.include_router(admin.router)

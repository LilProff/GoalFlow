from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from backend.config import settings
from backend.models import SyncPushRequest, SyncPullResponse

router = APIRouter(prefix="/sync", tags=["sync"])

HEADERS = {
    "apikey": settings.supabase_anon_key,
    "Authorization": f"Bearer {settings.supabase_anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

TABLE_URL = f"{settings.supabase_url}/rest/v1/goalflow_data"


@router.get("/pull", response_model=SyncPullResponse)
async def pull() -> SyncPullResponse:
    """Pull latest data for Samuel from Supabase."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                TABLE_URL,
                headers=HEADERS,
                params={"user_id": f"eq.{settings.user_id}", "select": "data,updated_at"},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Supabase error: {resp.text}")

        rows = resp.json()
        if not rows:
            return SyncPullResponse(data={}, updated_at="", found=False)

        row = rows[0]
        return SyncPullResponse(data=row["data"], updated_at=row["updated_at"], found=True)

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {str(e)}")


@router.post("/push")
async def push(req: SyncPushRequest) -> dict[str, Any]:
    """Push Samuel's data to Supabase via upsert."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "user_id": settings.user_id,
            "data": req.data,
            "updated_at": now,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                TABLE_URL,
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=payload,
            )

        if resp.status_code not in (200, 201, 204):
            raise HTTPException(status_code=502, detail=f"Supabase upsert error: {resp.text}")

        return {"ok": True, "updated_at": now}

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Supabase unreachable: {str(e)}")

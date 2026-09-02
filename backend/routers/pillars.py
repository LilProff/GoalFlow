from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from deps import get_current_user, get_supabase
from models import PillarCreate, PillarUpdate, PillarResponse, MessageResponse

router = APIRouter(prefix="/pillars", tags=["pillars"])


@router.get("/", response_model=list[PillarResponse])
async def get_pillars(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        resp = sb.table("pillars").select("*").eq("user_id", user_id).order("pillar_id").execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=PillarResponse, status_code=201)
async def create_pillar(data: PillarCreate, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        payload = {
            "user_id": user_id, "pillar_id": data.pillar_id, "label": data.label,
            "description": data.description, "color": data.color, "icon": data.icon,
            "enabled": data.enabled, "categories": data.categories or [], "weekly_kpis": data.weekly_kpis or [],
        }
        resp = sb.table("pillars").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create pillar")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{pillar_id}", response_model=PillarResponse)
async def update_pillar(pillar_id: str, data: PillarUpdate, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        update_data = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = sb.table("pillars").update(update_data).eq("user_id", user_id).eq("pillar_id", pillar_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Pillar not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{pillar_id}", response_model=MessageResponse)
async def delete_pillar(pillar_id: str, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        sb.table("pillars").delete().eq("user_id", user_id).eq("pillar_id", pillar_id).execute()
        return MessageResponse(message="Pillar deleted", success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

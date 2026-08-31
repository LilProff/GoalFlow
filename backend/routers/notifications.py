from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import NotificationPrefs

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Columns the client is allowed to set, mirroring NotificationPrefs.
_PREF_COLUMNS = set(NotificationPrefs.model_fields)


def _defaults() -> dict:
    return NotificationPrefs().model_dump()


@router.get("/prefs", response_model=NotificationPrefs)
async def get_prefs(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> NotificationPrefs:
    """This user's notification preferences, creating defaults on first read."""
    resp = safe_single(sb.table("notification_prefs").select("*").eq("user_id", user_id))
    if resp.data:
        # Times come back from Postgres as "07:00:00"; the client's <input
        # type="time"> only accepts HH:MM.
        row = dict(resp.data)
        for key in ("morning_time", "evening_time"):
            if isinstance(row.get(key), str):
                row[key] = row[key][:5]
        return NotificationPrefs(**{k: v for k, v in row.items() if k in _PREF_COLUMNS})

    created = _defaults()
    try:
        sb.table("notification_prefs").insert({"user_id": user_id, **created}).execute()
    except Exception:
        # A concurrent first read may have created it — defaults are correct either way.
        pass
    return NotificationPrefs(**created)


@router.patch("/prefs", response_model=NotificationPrefs)
async def update_prefs(
    data: dict,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> NotificationPrefs:
    """Partial update — only the fields present in the body are written."""
    update = {k: v for k, v in data.items() if k in _PREF_COLUMNS}
    if not update:
        raise HTTPException(status_code=400, detail="No valid preference fields to update")

    try:
        resp = sb.table("notification_prefs").update(update).eq("user_id", user_id).execute()
        if not resp.data:
            # No row yet (user predates the prefs table) — insert defaults + the change.
            merged = {**_defaults(), **update}
            resp = sb.table("notification_prefs").insert({"user_id": user_id, **merged}).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    row = dict(resp.data[0]) if resp.data else {**_defaults(), **update}
    for key in ("morning_time", "evening_time"):
        if isinstance(row.get(key), str):
            row[key] = row[key][:5]
    return NotificationPrefs(**{k: v for k, v in row.items() if k in _PREF_COLUMNS})

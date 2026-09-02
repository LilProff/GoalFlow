from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from config import settings
from deps import get_current_user, get_supabase, safe_single
from models import NotificationPrefs, PushSubscriptionCreate
from services.push import send_push_to_user, push_configured

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


# ── Web Push subscriptions ──────────────────────────────────────────────────
@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    So the frontend can fetch the public key from a source of truth instead
    of needing its own copy of VITE_VAPID_PUBLIC_KEY kept in sync by hand —
    it's public data (safe to expose unauthenticated), unlike the private key.
    """
    return {"public_key": settings.vapid_public_key, "configured": push_configured()}


@router.post("/push-subscribe", status_code=201)
async def push_subscribe(
    data: PushSubscriptionCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """
    Upsert by endpoint (unique per browser/device) — re-subscribing the same
    device (e.g. after the browser rotated the subscription, which it does
    periodically) replaces the row instead of accumulating duplicates that
    would each receive the same push twice.
    """
    row = {
        "user_id": user_id,
        "endpoint": data.endpoint,
        "p256dh": data.keys.p256dh,
        "auth": data.keys.auth,
        "user_agent": data.user_agent,
    }
    try:
        sb.table("push_subscriptions").upsert(row, on_conflict="endpoint").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"ok": True}


@router.delete("/push-subscribe")
async def push_unsubscribe(
    endpoint: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    # Scoped to this user too, not just the endpoint — a caller can only ever
    # remove their own subscription even if they somehow knew another user's
    # endpoint string.
    sb.table("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user_id).execute()
    return {"ok": True}


@router.post("/push-test")
async def push_test(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Sends one push to every device this user has registered — lets the
    Settings UI confirm push actually reaches the device right after enabling it,
    rather than the user finding out it's broken the first time a real reminder misses."""
    result = await send_push_to_user(
        sb, user_id,
        title="GoalFlow",
        body="Push notifications are working.",
        url="/dashboard",
        tag="test",
    )
    if not result["configured"]:
        raise HTTPException(status_code=503, detail="Push notifications are not configured on this server yet.")
    if result["sent"] == 0:
        raise HTTPException(status_code=404, detail="No push subscription found for this device. Enable push in Settings first.")
    return result

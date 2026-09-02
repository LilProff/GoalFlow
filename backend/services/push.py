"""
Web Push (VAPID) sending — the server-side half of push notifications.

Subscribing (browser permission, PushManager.subscribe, posting the
resulting subscription here) lives in routers/notifications.py; this module
is just "given a subscription and a message, deliver it."
"""
import json
import logging

from pywebpush import webpush, WebPushException
from supabase import Client

from config import settings

logger = logging.getLogger(__name__)


def push_configured() -> bool:
    return bool(settings.vapid_private_key and settings.vapid_public_key)


async def send_push_to_user(
    sb: Client,
    user_id: str,
    title: str,
    body: str,
    *,
    url: str = "/dashboard",
    tag: str | None = None,
) -> dict:
    """
    Sends to every subscription this user has (phone + desktop both get it).
    A subscription that the push service reports as gone (410/404 — the user
    uninstalled, cleared data, or the browser revoked it) is deleted here
    rather than left to fail forever on every future send.
    """
    if not push_configured():
        return {"sent": 0, "failed": 0, "configured": False}

    resp = sb.table("push_subscriptions").select("*").eq("user_id", user_id).execute()
    subs = resp.data or []
    if not subs:
        return {"sent": 0, "failed": 0, "configured": True}

    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    sent = failed = 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject or "mailto:support@example.com"},
            )
            sent += 1
        except WebPushException as e:
            status = getattr(e.response, "status_code", None)
            if status in (404, 410):
                try:
                    sb.table("push_subscriptions").delete().eq("id", sub["id"]).execute()
                except Exception:
                    pass
            else:
                logger.warning("Push send failed for subscription %s: %s", sub["id"], e)
            failed += 1
        except Exception as e:
            logger.warning("Push send failed for subscription %s: %s", sub["id"], e)
            failed += 1

    return {"sent": sent, "failed": failed, "configured": True}

"""
The planning engine: turns "routine container + cadenced projects + what's
already logged" into (a) a single next-hour recommendation and (b) a full
week's worth of scheduled sessions.

Deliberately NOT an LLM call for the allocation itself — cadence math
("this project needs 2 more sessions this week") and slot-fitting are exact
arithmetic, and free-form generation is the wrong tool for exact arithmetic
(it's also the failure mode already seen in reshuffle: truncated/malformed
JSON on a big response). The AI is reserved for language tasks it's actually
good at — see routers/life_structure.py for where that boundary sits.
"""
from datetime import date, timedelta
from typing import Optional

from supabase import Client

# project.kind -> planner BlockCategory (see frontend Planner.tsx's CAT map)
KIND_TO_CATEGORY = {
    "work": "work",
    "startup": "deepwork",
    "personal_build": "deepwork",
    "learning": "learning",
    "content": "show",
    "outreach": "earn",
    "health": "health",
    "relationships": "social",
    "other": "admin",
}


def week_start_for(d: date) -> date:
    """Monday of the week containing d (Mon=0..Sun=6, matching cadence_days)."""
    return d - timedelta(days=d.weekday())


def sessions_target(project: dict) -> int:
    cadence_type = project.get("cadence_type", "weekly")
    if cadence_type == "daily":
        return 7
    if cadence_type == "fixed_day":
        return len(project.get("cadence_days") or [])
    if cadence_type == "weekly":
        return int(project.get("sessions_per_week") or 0)
    return 0  # flexible — no obligation


def load_projects(sb: Client, user_id: str, status: str = "active") -> list[dict]:
    resp = (
        sb.table("projects").select("*")
        .eq("user_id", user_id).eq("status", status)
        .execute()
    )
    return resp.data or []


def load_routine(sb: Client, user_id: str) -> list[dict]:
    resp = sb.table("routine_blocks").select("*").eq("user_id", user_id).execute()
    return resp.data or []


def sessions_logged_this_week(sb: Client, user_id: str, week_start: date) -> dict[str, int]:
    """project_id -> count of sessions logged (project_updates) within the week."""
    week_end = week_start + timedelta(days=7)
    resp = (
        sb.table("project_updates").select("project_id,counts_as_session,date_key")
        .eq("user_id", user_id)
        .gte("date_key", week_start.isoformat())
        .lt("date_key", week_end.isoformat())
        .execute()
    )
    counts: dict[str, int] = {}
    for row in (resp.data or []):
        if row.get("counts_as_session"):
            pid = row["project_id"]
            counts[pid] = counts.get(pid, 0) + 1
    return counts


def attach_cadence(project: dict, sessions_this_week: int) -> dict:
    return {
        **project,
        "sessions_this_week": sessions_this_week,
        "sessions_target": sessions_target(project),
    }


# ── Next-hour recommendation ────────────────────────────────────────────────
def find_active_routine_block(routine: list[dict], weekday: int, minute: int) -> Optional[dict]:
    for r in routine:
        days = r.get("days_of_week") or []
        if weekday in days and r["start_minute"] <= minute < r["end_minute"]:
            return r
    return None


def recommend_next_action(
    routine: list[dict],
    projects: list[dict],
    logged_counts: dict[str, int],
    today_blocks: list[dict],
    weekday: int,
    now_minute: int,
) -> dict:
    """Pure function (no I/O) so it's directly unit-testable. Returns a dict
    matching NextActionResponse's fields."""
    active = find_active_routine_block(routine, weekday, now_minute)

    if not active:
        return {
            "slot_label": "Unstructured time",
            "slot_type": "open",
            "minutes_left_in_slot": 0,
            "recommendation": "No routine block covers right now — set up your weekly routine in Settings so Ryna knows what this hour is for.",
        }

    minutes_left = active["end_minute"] - now_minute

    # Something's already deliberately on the calendar right now (fixed
    # commitment or a project session already placed) — respect it rather
    # than propose something new on top of it.
    for b in today_blocks:
        if b["start_minute"] <= now_minute < b["start_minute"] + b["duration_minutes"] and not b.get("completed"):
            return {
                "slot_label": active["label"],
                "slot_type": active["slot_type"],
                "minutes_left_in_slot": minutes_left,
                "recommendation": f"Already on your plan: {b['label']}.",
                "task_title": b["label"],
                "project_id": b.get("project_id"),
                "reason": "Currently scheduled",
            }

    if not active.get("is_schedulable"):
        return {
            "slot_label": active["label"],
            "slot_type": active["slot_type"],
            "minutes_left_in_slot": minutes_left,
            "recommendation": f"{active['label']} — this is routine time, not work time. Nothing to schedule.",
        }

    # Candidates: active projects whose slot_types include this slot (or
    # declare no preference), with room in this slot for one session.
    candidates = []
    for p in projects:
        slot_types = p.get("slot_types") or []
        if slot_types and active["slot_type"] not in slot_types:
            continue
        if p.get("session_minutes", 60) > minutes_left and minutes_left < 15:
            continue
        target = sessions_target(p)
        done = logged_counts.get(p["id"], 0)
        debt = target - done
        candidates.append((p, debt))

    if not candidates:
        return {
            "slot_label": active["label"],
            "slot_type": active["slot_type"],
            "minutes_left_in_slot": minutes_left,
            "recommendation": f"{active['label']} is open and nothing's assigned to it yet — a good place for whatever's most urgent, or add a project that fits this slot.",
        }

    # Most behind on cadence first, then main quest, then declared priority.
    candidates.sort(key=lambda pc: (-pc[1], not pc[0].get("is_main_quest"), pc[0].get("priority", 3)))
    best, debt = candidates[0]

    if debt <= 0:
        reason = "On pace — next in rotation"
    elif debt >= 2:
        reason = f"Behind by {debt} sessions this week"
    else:
        reason = "Due this week"

    return {
        "slot_label": active["label"],
        "slot_type": active["slot_type"],
        "minutes_left_in_slot": minutes_left,
        "recommendation": f"{best['name']} — {reason.lower()}.",
        "project_id": best["id"],
        "project_name": best["name"],
        "reason": reason,
    }


# ── Week plan ────────────────────────────────────────────────────────────────
class _Window:
    __slots__ = ("weekday", "slot_type", "cursor", "end")

    def __init__(self, weekday: int, slot_type: str, start: int, end: int):
        self.weekday = weekday
        self.slot_type = slot_type
        self.cursor = start
        self.end = end

    def remaining(self) -> int:
        return self.end - self.cursor


def build_week_plan(
    routine: list[dict],
    projects: list[dict],
    logged_counts: dict[str, int],
) -> tuple[dict[int, list[dict]], list[str]]:
    """Pure allocation. Returns {weekday: [new time_block dicts]} (fixed
    routine layer + project sessions, NOT yet written to the DB) and a list
    of project names that couldn't get a single session placed this week."""
    day_blocks: dict[int, list[dict]] = {i: [] for i in range(7)}
    windows: list[_Window] = []

    for r in routine:
        for weekday in (r.get("days_of_week") or []):
            if not (0 <= weekday <= 6):
                continue
            if r.get("is_schedulable"):
                windows.append(_Window(weekday, r["slot_type"], r["start_minute"], r["end_minute"]))
            else:
                day_blocks[weekday].append({
                    "label": r["label"], "category": r.get("category", "admin"),
                    "start_minute": r["start_minute"],
                    "duration_minutes": r["end_minute"] - r["start_minute"],
                    "flexible": False, "priority": "fixed", "user_editable": True,
                    "notes": "Routine", "pillar_id": None, "project_id": None,
                })

    windows.sort(key=lambda w: (w.weekday, w.cursor))

    # Build the session queue: (project, sessions_needed_this_week), ordered
    # main-quest first, then priority, so scarce slots go to what matters
    # most when the week can't fit everything.
    queue: list[tuple[dict, int]] = []
    for p in projects:
        target = sessions_target(p)
        done = logged_counts.get(p["id"], 0)
        needed = max(target - done, 0)
        if needed > 0:
            queue.append((p, needed))
    queue.sort(key=lambda pn: (not pn[0].get("is_main_quest"), pn[0].get("priority", 3)))

    placed_any: dict[str, bool] = {p["id"]: False for p, _ in queue}
    GAP = 10

    for project, needed in queue:
        slot_types = project.get("slot_types") or []
        session_len = project.get("session_minutes", 60)
        fixed_days = project.get("cadence_days") if project.get("cadence_type") == "fixed_day" else None

        placed = 0
        for w in windows:
            if placed >= needed:
                break
            if fixed_days is not None and w.weekday not in fixed_days:
                continue
            if slot_types and w.slot_type not in slot_types:
                continue
            if w.remaining() < session_len:
                continue
            day_blocks[w.weekday].append({
                "label": project["name"], "category": KIND_TO_CATEGORY.get(project.get("kind", "work"), "work"),
                "start_minute": w.cursor, "duration_minutes": session_len,
                "flexible": True, "priority": "high" if project.get("is_main_quest") else "medium",
                "user_editable": True, "notes": f"Weekly plan — {project.get('kind', 'work')}",
                "pillar_id": project.get("pillar_id"), "project_id": project["id"],
            })
            w.cursor += session_len + GAP
            placed += 1
            placed_any[project["id"]] = True

    at_risk = [p["name"] for p, _ in queue if not placed_any.get(p["id"])]
    return day_blocks, at_risk

"""
Flexible, adaptive goal timelines.

Goals used to all share one hardcoded 90-day target date. Instead, every
goal gets a *prospective* timeline the system proposes (estimate_target_date),
a live read-only pace readout comparing actual progress against elapsed time
(compute_pace), and — only when the user or Ryna explicitly asks for it,
never silently — a proposed adjustment (propose_replan).
"""
from datetime import date, timedelta
from typing import Optional

# Base horizon per timeline tier. Deliberately not the same fixed window
# for everything — a short-term goal is meant to be reachable in weeks,
# a long-term one in months.
SHORT_TERM_BASE_DAYS = 21
LONG_TERM_BASE_DAYS = 180

# Some goal types genuinely need longer than others regardless of tier —
# a certification or a habit isn't done at the same pace as a one-off
# project task.
GOAL_TYPE_ADJUST_DAYS: dict[str, int] = {
    "project": 0,
    "outcome": 14,
    "learning": 21,
    "certification": 30,
    "habit": 14,
}

# A goal within this many points of its expected progress reads as
# "on track" rather than nudging the user over noise.
PACE_TOLERANCE = 10.0


def estimate_target_date(
    timeline_type: str,
    goal_type: str = "project",
    today: Optional[date] = None,
) -> date:
    """Propose a target date for a goal that doesn't have one yet."""
    today = today or date.today()
    base = LONG_TERM_BASE_DAYS if timeline_type == "long-term" else SHORT_TERM_BASE_DAYS
    adjust = GOAL_TYPE_ADJUST_DAYS.get(goal_type, 0)
    return today + timedelta(days=base + adjust)


def compute_pace(
    progress: int,
    created_at: date,
    target_date: date,
    today: Optional[date] = None,
) -> dict:
    """
    Read-only comparison of actual progress vs. where the goal "should" be
    given how much of its window has elapsed. Never persisted — recomputed
    fresh every time a goal is read.
    """
    today = today or date.today()
    total_days = (target_date - created_at).days
    elapsed_days = (today - created_at).days

    if total_days <= 0:
        expected_progress = 100.0
    else:
        expected_progress = max(0.0, min(100.0, (elapsed_days / total_days) * 100))

    delta = progress - expected_progress
    if delta >= PACE_TOLERANCE:
        status = "ahead"
    elif delta <= -PACE_TOLERANCE:
        status = "behind"
    else:
        status = "on_track"

    return {
        "expected_progress": round(expected_progress, 1),
        "status": status,
        "days_remaining": (target_date - today).days,
    }


def propose_replan(pace: dict, current_target: date, today: Optional[date] = None) -> date:
    """
    Only called from an explicit "adjust timeline" action — never runs on
    its own. Pushes the date out when behind, pulls it in a little when
    consistently ahead, leaves it alone when on track.
    """
    today = today or date.today()
    status = pace.get("status", "on_track")

    if status == "behind":
        return current_target + timedelta(days=14)
    if status == "ahead":
        pulled = current_target - timedelta(days=7)
        floor = today + timedelta(days=3)
        return pulled if pulled > floor else floor
    return current_target

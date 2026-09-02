# GoalFlow Roadmap

What GoalFlow is: not a to-do list app. An AI execution OS that understands your
long- and short-term goals, acts as a personal assistant, keeps you accountable
for your time (including to other people who assign you work), tracks goal
execution through daily task completion, reshuffles your day when things slip,
and coaches you — with a companion mobile app and voice interaction as the app
matures.

Status as of 2026-09-01. See PLAN_v2.md for the original detailed product spec;
this file tracks what's actually shipped vs. deliberately deferred, and why.

## Shipped

- **Auth** — self-issued JWT (bcrypt + HS256), not a third-party provider.
  Signup/login/refresh/logout/change-password.
- **Onboarding** — 6-step wizard (identity, pillars, categories, goals,
  schedule, coach style), or a chat-based alternative. Progress persists
  across a reload/backgrounded tab.
- **Core loop** — Dashboard (today's tasks + score + streak), Tasks CRUD,
  Goals with milestones (90-day sprints), the 24-hour Planner (timeline +
  list views, AI reshuffle on request), Analytics, Leaderboard.
- **Ryna (AI coach)** — chat + morning-insight endpoints, coaching-style
  switching, conversation history. Runs on free-tier OpenRouter models today
  (see "AI depth" below for what's next).
- **PWA** — installable, offline-capable app shell, mobile-responsive layout
  with a bottom tab bar below desktop width.
- **Push notifications** — Web Push (VAPID) subscribe/send/cleanup.
- **Session persistence, offline indicator.**

## Deferred to a future phase

**AI depth — the core "PA" intelligence**
- Advanced Claude model + agentic harness for goal management/planning/task
  execution. Ryna currently does single-turn prompt completion against free
  OpenRouter models, not a planning agent with tools, multi-step reasoning,
  or memory across sessions.
- Voice interface — nothing built yet. Candidates: xAI voice, Vapi,
  ElevenLabs, FishAudio.
- **Scheduling** (full scope, confirmed 2026-09-01) — three components that
  work together:
  1. Calendar sync (Google/Outlook OAuth) — the app has zero calendar
     awareness today.
  2. A recurrence engine for repeating tasks/habits, independent of any
     calendar.
  3. AI auto-placement — given the backlog, recurring commitments, and real
     calendar gaps, decide *when* things happen. This should absorb/replace
     the existing `/planner/reshuffle` and `/tasks/generate` endpoints
     rather than sit beside them.
- Notification *scheduling* — the push infrastructure works, but nothing
  triggers a send on a timer yet. `notification_prefs` already stores
  morning-briefing/evening-reflection times; there's no cron/background job
  acting on them.
- A "commitments / follow-ups" tracker — for tasks *other people* assign the
  user, distinct from self-directed Goals/Tasks. Doesn't exist yet.

**Mobile**
- Native Flutter app — the PWA is the deliberate stand-in; a real native
  build/test/ship wasn't realistic on the original timeline.

**Depth on existing features**
- Offline mutation queue — actions taken offline apply optimistically
  locally but aren't retried on reconnect.
- Multi-device session revocation — tokens are stateless with no revocation
  list; "sign out" only affects the current device.
- Settings → Appearance theming — accent-color swatches are decorative,
  no backend support.

## Not a feature, but blocking "fully live"
- Deployment — code and configs (`render.yaml`, `vercel.json`) are ready;
  blocked on creating the actual Render/Vercel accounts.

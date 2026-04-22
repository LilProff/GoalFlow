# GoalFlow — SaaS Product Plan

> **Vision:** The AI operating system for high-performers.
> Not another to-do app. A structured system that takes your life goals, breaks them into daily
> actions, coaches you in real-time, and tracks your transformation — habits, streaks, time,
> income — all in one place.

---

## Production Sprint (2 Weeks)
- Objective: Prepare GoalFlow for production release with web (Vercel) + backend (Railway), email-only auth, and a robust 2-week sprint plan.
- Sprint window: 14 days from plan start.
- Scope: polish UI, finish auth flow (email-only), wire up envs, migrate DB, fix loading, enable production-ready CI hints, and set up deployment pipelines.
- Deliverables:
  - PLAN.md updated with 2-week sprint plan (this doc)
  - PLAN_v2.md aligned with sprint milestones
  - .env.template (secure onboarding for envs) and an .env.local placeholder for local dev
  - Production-grade UI polish to ensure clean loading and consistent layout on desktop, tablet, and mobile breakpoints
  - Email-only auth wired via Supabase (no Google OAuth yet)
  - Basic push notification scaffold (browser) and note-taking hooks
  - Voice capture scaffold (Web Speech API) as a feature flag
  - Docker/CI scaffolding for Vercel + Railway deployment (or GitHub Actions example)
  - Branding assets (logo) and design tokens for consistency

Notes:
- You requested Vercel frontend + Railway backend as default; I’ll push updates to GitHub first and trigger deployments later.
- I’ll keep PLAN.md and PLAN_v2.md synchronized and reflect all progress in them.

## Positioning

**Product:** GoalFlow
**Tagline:** *"Your AI-powered life operating system"*
**Target user:** Ambitious 18–35 year olds. Freelancers, founders, students, professionals.
**Market:** Nigeria / Africa-first → global expansion
**Differentiator:** Not productivity software. A complete personal performance system with a
personalised AI coach (Ryna) that knows you, remembers you, and keeps you on track.

---

## Core Feature Set

### 1. Auth + Onboarding

```
Supabase Auth (Email + Google OAuth)
  ↓
Onboarding Wizard — 5 Steps:

  Step 1 — Who are you?
    · Full name, timezone, occupation
    · Weekly available work/growth hours

  Step 2 — Life areas to track
    · Pick from: Career, Finance, Health, Relationships,
      Spirituality, Learning, Creativity + Custom areas

  Step 3 — Your big goals
    · 1 goal per selected area (90-day horizon)
    · e.g. "Hit $5K/month revenue by June"

  Step 4 — Daily schedule template
    · Wake time, sleep time
    · Deep work blocks, admin blocks, rest blocks

  Step 5 — Habits to build or break
    · Add 3–5 habits
    · Type: BUILD (create) or BREAK (end)
    · Set trigger time + frequency

  ↓
AI (Ryna) generates personalised dashboard + first week plan
```

---

### 2. Goals System — Strategic to Tactical

```
Life Vision (5-year north star)
  └── Quarterly Goals (OKR-style: Objective + Key Results)
        └── Monthly Milestones
              └── Weekly Targets
                    └── Daily Tasks  ←  Core tracker (built)
```

- Every level has a progress indicator
- AI can drill down: *"To hit your $5K/mo goal, you need to close 2 clients this week"*
- Goals link to life areas
- Mark goals complete, archive, or roll forward

---

### 3. Habit Engine

Each habit has:
- **Name + cue + trigger + reward** (habit loop framework)
- **Type:** `BUILD` (create new behaviour) or `BREAK` (end existing one)
- **Frequency:** daily / weekdays / custom days
- **Streak tracking:** current, longest, last completed date
- **One-tap check-in** — no friction logging

**Streak mechanics:**
- Grace period: 1 missed day per week doesn't break the streak
- Milestone celebrations: 7, 21, 66, 100, 365 days
- Streak at-risk alert: *"You haven't done X today — 3 hours left"*
- Habit stacking: link habits to existing schedule slots

---

### 4. AI Coach — Ryna (Personalised)

**Memory layer (Mem0):**
- Knows your goals, patterns, and where you struggle
- Remembers: *"Samuel always skips exercise on Thursdays"*
- Updates over time as your behaviour changes

**Coach modes:**
| Mode | Trigger | What it does |
|------|---------|--------------|
| Morning Brief | User's wake time | Today's plan based on goals + priorities |
| Evening Debrief | User-set time | Reviews the day, what to carry forward |
| Weekly Review | Sunday evening | AI-generated performance report |
| Real-time Chat | On demand | Voice or text — takes live actions |
| Crisis Mode | "My day fell apart" | Full reshuffle + motivational reset |
| Habit Nudge | Streak at risk | Proactive reminder to log |

**Coaching styles** (set during onboarding):
- 🪖 Strict drill-sergeant
- ⚖️ Balanced mentor
- 🤝 Gentle encourager

**Ryna's live actions:**
- Add / remove tasks
- Mark tasks complete
- Reshuffle schedule
- Set timers
- Log reflections
- Navigate the app
- Report on progress
- Update goals
- Log habit check-ins

---

### 5. Time Management

**Time block planner:**
- Visual day view with drag-and-drop
- Block types: Deep Work / Shallow Work / Admin / Rest / Personal
- Clock in / clock out per block (actual vs planned)
- Weekly time audit: *"You planned 10h deep work, you did 6h"*

**Enhanced Pomodoro:**
- Per-task focus timer
- Distraction log (tap when distracted)
- Daily focus score
- Session history

---

### 6. Analytics + Reporting

**Daily Stamp** (exists — enhanced):
- Completion rate, reflection, mood (optional)

**Weekly Report (AI-generated):**
- Task completion %, habit streak summary, time distribution
- AI narrative: *"This was a strong week for your Career goal..."*
- Exportable PDF
- Emailed every Sunday

**Dashboard charts:**
- Goal progress over time (line)
- Habit heatmap (GitHub-style calendar)
- Streak calendar view
- Time allocation by category (pie / bar)
- Productivity score trend (7/30/90 days)
- Completion rate history

---

### 7. Smart Notifications + Reminders

| Notification | When | Channel |
|-------------|------|---------|
| Morning brief | User's wake time | Push + Email |
| Schedule block starting | 15 min before | Push |
| Habit check-in reminder | User-set trigger time | Push |
| Streak at-risk alert | End of day if habit not logged | Push |
| Evening reflection prompt | User-set time | Push |
| Weekly review | Sunday evening | Push + Email |
| Milestone celebration | On achievement | In-app |
| Goal deadline approaching | 7 days before | Push + Email |

---

## Technical Architecture

### Database Schema (Supabase / PostgreSQL)

```sql
-- Core user tables
users                 id, email, name, timezone, created_at, plan_tier
user_profiles         user_id, occupation, coaching_style, work_hours,
                      wake_time, sleep_time, onboarding_complete

-- Goal hierarchy
life_areas            user_id, name, icon, color, is_active, sort_order
goals                 user_id, area_id, title, horizon(5yr/quarterly/monthly/weekly),
                      target_date, progress_pct, parent_goal_id, status, notes

-- Daily tracker
daily_data            user_id, date, tasks(jsonb), schedule(jsonb),
                      reflection(jsonb), completion_rate, mood
schedule_templates    user_id, name, blocks(jsonb), is_default

-- Habits
habits                user_id, name, type(build/break), cue, reward,
                      frequency(jsonb), streak_current, streak_longest,
                      streak_grace_used, last_completed, is_active
habit_logs            habit_id, user_id, date, completed, skipped, notes

-- AI + memory
ryna_memory           user_id, memory_key, value, updated_at
ryna_conversations    user_id, date, messages(jsonb)

-- Notifications
notification_prefs    user_id, type, enabled, time, channel(push/email/whatsapp)
notification_log      user_id, type, scheduled_for, sent_at, opened_at

-- Billing
subscriptions         user_id, plan(free/pro/team), status, paystack_sub_id,
                      current_period_end, cancel_at
```

---

### Backend Services (FastAPI — expand current)

```
/api/v1/
  auth/
    POST  /webhook              ← Supabase auth events
  users/
    GET   /me                   ← current user profile
    PATCH /me                   ← update profile
  onboarding/
    POST  /save-step            ← save each wizard step
    POST  /complete             ← trigger AI plan generation
  goals/
    GET   /                     ← all goals (hierarchical)
    POST  /                     ← create goal
    PATCH /:id                  ← update progress / status
    DELETE /:id
  habits/
    GET   /                     ← all habits + today's log
    POST  /                     ← create habit
    POST  /:id/checkin          ← log completion for today
    GET   /:id/history          ← streak + log history
  daily/
    GET   /:date                ← daily data for a date
    POST  /:date                ← upsert daily data
    GET   /history              ← range query for analytics
  ryna/
    POST  /chat                 ← main AI chat (current)
    POST  /reshuffle            ← schedule reshuffle (current)
    POST  /morning-brief        ← generate daily brief
    POST  /weekly-review        ← generate weekly report
  analytics/
    GET   /summary              ← dashboard stats
    GET   /habits               ← habit heatmap data
    GET   /time                 ← time allocation data
    GET   /goals                ← goal progress history
  reports/
    POST  /weekly-pdf           ← generate + return PDF
  notifications/
    GET   /preferences
    PATCH /preferences
  billing/
    POST  /create-subscription  ← Paystack subscription
    POST  /webhook              ← Paystack events
    GET   /status               ← current plan
```

---

### Frontend — Next.js 14 Migration

**Why migrate from Vite → Next.js:**
- SSR / SSG for fast initial load
- Protected routes with middleware
- `/app` router structure
- Better SEO (marketing page)
- API routes for lightweight logic

```
App Router Structure:
  /                        → Marketing landing page
  /auth/
    /login
    /signup
    /callback              ← OAuth redirect
  /onboarding/             → 5-step wizard (blocked until complete)
  /dashboard/              → Main app (protected)
    /goals/                → Goal hierarchy view
    /habits/               → Habit tracker + streak view
    /schedule/             → Day planner + time blocks
    /analytics/            → Charts + reports
    /settings/
      /profile
      /notifications
      /billing
      /coaching-style
  /api/                    → Next.js API routes (lightweight)
```

---

### AI Stack

| Task | Model | Why |
|------|-------|-----|
| Ryna chat (real-time) | `llama-3.1-8b-instruct:free` | Fast, free |
| Schedule reshuffle | `arcee-ai/trinity-large-preview:free` | Quality reasoning |
| Onboarding plan generation | `deepseek/deepseek-r1-0528` | Best planning |
| Weekly AI report | `google/gemini-2.5-pro-exp` | Long context, narrative |
| Morning brief / nudges | `claude-haiku` or `gemma-3-4b:free` | Cheap, fast |
| User memory | Mem0 Cloud | Persistent cross-session |

---

### Infrastructure

```
Frontend:    Vercel          (Next.js — free tier → Pro at scale)
Backend:     Railway         (FastAPI — current, auto-scales)
Database:    Supabase        (Postgres + Auth + Realtime + pgvector)
Queue/Jobs:  n8n Cloud       (notifications, weekly reports, reminders)
AI Router:   OpenRouter      (current — model-agnostic)
Memory:      Mem0 Cloud      (free 1K memories → paid at scale)
Payments:    Paystack        (Nigeria/Africa primary)
             Stripe          (global expansion)
Email:       Resend          (transactional — free 3K/mo)
SMS:         Termii          (Nigeria)
WhatsApp:    WATI            (habit nudges, morning briefs)
File storage: Supabase Storage (report PDFs, user avatars)
```

---

## Monetisation

```
──────────────────────────────────────────────────────────────────────
  FREE TIER                    forever free, acquisition driver
  ─────────────────────────────────────────────────────────────────
  · 1 life area
  · 3 active goals
  · 3 active habits
  · 7-day history
  · Ryna: 10 messages/day (text only)
  · No AI reports
  · No reminders

──────────────────────────────────────────────────────────────────────
  PRO — $9/mo  (₦15,000/mo)    core revenue driver
  ─────────────────────────────────────────────────────────────────
  · Unlimited life areas, goals, habits
  · Full history + CSV export
  · Unlimited Ryna (text + voice)
  · Ryna memory (personalised coaching)
  · Weekly AI report (PDF)
  · Smart push + email notifications
  · Morning brief + evening debrief

──────────────────────────────────────────────────────────────────────
  TEAM / COACH — $29/mo        upsell + B2B channel
  ─────────────────────────────────────────────────────────────────
  · Everything in Pro
  · Share dashboard with accountability partner or coach
  · Coach view: see up to 10 client dashboards
  · Group challenges + leaderboards
  · Team goal tracking
  · Dedicated coach workspace
──────────────────────────────────────────────────────────────────────
```

**Revenue targets:**
- Month 3: 20 Pro users → $180/mo
- Month 6: 100 Pro users → $900/mo
- Month 12: 500 Pro + 20 Team → $5,080/mo

---

## Build Phases

### ✅ Phase 1A — Core Tracker (DONE)
- [x] Daily task tracker
- [x] Schedule view
- [x] Ryna AI PA (chat + voice + actions)
- [x] Pomodoro timer
- [x] Daily reflection
- [x] Supabase cloud sync
- [x] In-app toasts + notifications
- [x] PWA (installable)
- [x] History persistence
- [x] Reshuffle modal
- [x] Chat panel with message thread
- [x] Service worker + caching

---

### 🔲 Phase 1B — Auth + Multi-user (Next — Weeks 1–2)
- [ ] Supabase Auth (email + Google OAuth)
- [ ] Login / Signup pages
- [ ] Protected route middleware
- [ ] Per-user data isolation (add `user_id` to all DB queries)
- [ ] User profile table
- [ ] Basic onboarding (name + timezone + 1 goal — simplified v1)
- [ ] Deploy to Vercel (frontend) + Railway (backend)
- [ ] Custom domain (goalflow.app or similar)

---

### 🔲 Phase 2 — Habits + Goals (Weeks 3–5)
- [ ] Goal hierarchy (life vision → quarterly → monthly → weekly → daily)
- [ ] Habit engine (build/break, frequency, check-in)
- [ ] Streak calculation + grace period logic
- [ ] Streak milestone celebrations (7, 21, 66, 100 days)
- [ ] Habit heatmap calendar
- [ ] Goal progress bar + history chart
- [ ] Link daily tasks to goals

---

### 🔲 Phase 3 — Full Onboarding + AI Memory (Weeks 6–8)
- [ ] 5-step onboarding wizard
- [ ] AI generates personalised first week plan from onboarding data
- [ ] Ryna memory via Mem0 (cross-session personalisation)
- [ ] Morning brief (automated, time-based)
- [ ] Evening debrief (automated)
- [ ] Habit check-in reminders (push via n8n)
- [ ] Streak at-risk alerts

---

### 🔲 Phase 4 — Analytics + Reports (Weeks 9–10)
- [ ] Full analytics dashboard (charts, heatmaps, trends)
- [ ] Weekly AI report (Gemini long-context narrative + PDF)
- [ ] Time audit (planned vs actual per block)
- [ ] Productivity score algorithm
- [ ] Weekly report email (Resend)

---

### 🔲 Phase 5 — Monetisation (Weeks 11–12)
- [ ] Paystack subscription integration
- [ ] Stripe integration (global)
- [ ] Free / Pro / Team feature gating
- [ ] Billing settings page
- [ ] Upgrade prompts at feature limits
- [ ] Marketing landing page (Next.js)
- [ ] Waitlist / early access campaign

---

### 🔲 Phase 6 — Scale + Growth (Post-launch)
- [ ] Next.js migration (from current Vite)
- [ ] Flutter mobile app (iOS + Android)
- [ ] Accountability partner / coach view
- [ ] Group challenges + opt-in leaderboards
- [ ] WhatsApp integration (Ryna via WATI)
- [ ] Notion + Google Calendar sync
- [ ] Public API
- [ ] Affiliate / referral programme

---

## Non-Functional Requirements

### Security
- All routes authenticated (JWT via Supabase)
- Row-Level Security (RLS) on all Supabase tables — users can only see their own data
- API keys in env vars only — never in frontend code
- Input validation: Pydantic v2 (backend), Zod (frontend)
- Rate limiting on AI endpoints (per user, per day by plan tier)
- HTTPS only — enforced at Vercel + Railway

### Performance
- AI responses: target < 2s (fast model + max_tokens cap)
- Page load: < 1.5s (Next.js SSR + edge caching)
- DB queries: indexed on `user_id + date` for daily data lookups
- Supabase Realtime for live sync across devices

### Reliability
- Offline-first: localStorage cache, sync when online
- AI fallback chain: 4 models, auto-switches on 429/404
- Error boundary: graceful crash recovery (already in place)
- Backend health check: `/health` endpoint monitored

### Scalability
- Stateless FastAPI — horizontal scale on Railway
- Supabase handles DB connection pooling
- n8n for async jobs (no blocking the main API)
- Separate AI service from core API when traffic grows

---

## Key Decisions Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend framework | Vite now → Next.js later | Ship fast now, migrate for SEO + SSR |
| Database | Supabase | Free tier, Auth built-in, pgvector for AI |
| AI routing | OpenRouter | Model-agnostic, free tier, fallback chain |
| Primary payment | Paystack | Nigeria-first, easy integration |
| Memory | Mem0 Cloud | Purpose-built for AI agents |
| Notifications | n8n Cloud | No-code scheduling, free 5 workflows |
| Mobile | Flutter | Samuel's primary mobile stack |
| Auth | Supabase Auth | Already using Supabase, free, robust |

---

*Last updated: 2026-04-20*
*Built by Samuel Ayomide — Lagos, Nigeria*

## Production Plan (Phase 2+ and Beyond)

- Objective: Turn GoalFlow into a robust AI-driven execution OS with a unified web+mobile front-end, shared backend infra, and production-ready auth/notifications.
- This section tracks what to build, what to deploy, and what to license/purchase to reach production-readiness.

### Immediate Production Tasks (Phase 2 goals)
- [ ] Finish CSS/ui polish so the web UI loads consistently on desktop and mobile.
- [ ] Implement production-grade auth flow:
  - Google OAuth (via Supabase Auth)
  - Email/password authentication with email verification
  - Secure API access with authenticated sessions
- [ ] Harden UI theme: proper dark/light theming, accessible contrast, and responsive layout fixes.
- [ ] Push notifications: integrate browser push using Push API / VAPID; ensure user opt-in flow.
- [ ] Voice features: add browser voice activation (Web Speech API) and voice-to-text transcription; hook into note taking and task creation.
- [ ] Notes: persistent notes linked to goals/daily logs with rich-text support.
- [ ] Multi-platform plan: define web app (Next.js) and mobile app (Flutter) sharing the same backend infra (Postgres + Supabase) and AI layer (OpenRouter / LangChain).
- [ ] Plan for a shared API layer and model routing (AI Layer) to support future mobile clients.
- [ ] Design a robust onboarding flow for cross-platform sign-in and device pairing.
- [ ] Create production-ready CI/CD: Vercel (frontend), Railway (backend), Supabase migrations, and monitoring/logging.
- [ ] Introduce a lightweight analytics guardrail: usage metrics, error rates, and performance dashboards.
- [ ] Create branding/artwork: logo, icons, and style tokens to support a consistent design system.

### Production Costs & Licensing
- Supabase: Free tier up to 2k–5kRPS depending on features; upgrade if needed.
- Vercel: Free/on-demand plans; consider Pro for higher concurrency and edge caching.
- Railway: Free tier for dev; scale plan if traffic grows.
- OpenRouter / AI models: consider usage limits and potential pay-as-you-go fees.
- Push notifications services: browser push is free; consider paid options if high volume.
- Voice recognition: Web Speech API is built-in in browsers; for server-side transcription, plan for Whisper API or similar.
- Domain & TLS: acquire domain, set up TLS (usually included with Vercel/Railway).
- Monitoring: consider a logging/metrics solution (e.g., Sentry, Grafana) in production.

### Milestones & Deliverables
- Phase 2: Auth, UI polish, and AI-driven tasks ready for production testing.
- Phase 3: Multi-platform (web+mobile) pilots, push notifications enabled, voice features rolled out.
- Phase 4: GA-ready analytics, performance budgets, and customer onboarding flows.

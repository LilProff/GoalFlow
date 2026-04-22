# GoalFlow v2 — AI Execution OS

> **Vision:** The AI-powered accountability system for high-performers who want to BUILD, SHOW (content), EARN, and SYSTEMIZE their lives.

> **Not a todo app.** This is a behavioral enforcement system that generates daily tasks, tracks execution, scores performance, and adapts strategy using AI agents.

---

## Positioning

| | |
|---|---|
| **Product** | GoalFlow |
| **Tagline** | *"Your AI execution operating system"* |
| **Target** | Ambitious 18-35 Nigerian/African founders, freelancers, creators |
| **Differentiator** | 4-pillar action system: BUILD • SHOW • EARN • SYSTEMIZE |

---

## The 4 Pillars

Every day, the user focuses on:

| Pillar | Definition | Daily Actions |
|--------|-----------|-------------|
| **BUILD** | Skill development, product building, learning | Code, study, practice |
| **SHOW** | Content creation, visibility, reach | Post, engage, publish |
| **EARN** | Revenue activities, client acquisition | outreach, closes, sales |
| **SYSTEMIZE** | Automation, process improvement, delegation | Document, automate, delegate |

---

## Onboarding Flow (5 Steps)

```
Step 1 — Identity
  · Full name
  · Email + password (Google OAuth)
  · Timezone
  · Current phase (1: Just Starting, 2: Growing, 3: Scaling)

Step 2 — The 4 Pillars Assessment
  · BUILD: What's your main skill/product?
  · SHOW: What's your content platform?
  · EARN: How do you make money/want to make money?
  · SYSTEMIZE: What process needs automation?

Step 3 — Big Goals
  · 90-day income target
  · 90-day content goal
  · 90-day build goal
  · SYSTEMIZE goal

Step 4 — Available Time
  · Wake time / Sleep time
  · Daily hours available (2-4 / 4-6 / 6-8 / 8+)
  · Deep work windows

Step 5 — AI Coach Style
  · Drill Sergeant (strict, high accountability)
  · Balanced Mentor (encouraging + direct)
  · Gentle Guide (soft nudges, patience)

↓
AI generates personalized Day 1 plan
```

---

## Core Features

### 1. Daily Execution Panel

```
Main dashboard showing today's 4-pillar tasks:

[ BUILD ]  [ SHOW ]  [ EARN ]  [ SYSTEMIZE ]
    ☐         ☐        ☐          ☐
   Task      Task     Task        Task

Live Score Ring (0-10)
Streak Counter (days)
Level Badge
```

- One-tap checkbox for each pillar
- Animated completion feedback
- Auto-generate subtasks per pillar via AI

### 2. AI Task Generator

- Generates 4 daily tasks (one per pillar)
- Context-aware: uses last 7 days data
- Stores generated tasks in DB
- User can regenerate / accept

### 3. Performance Scoring

```
Score calculation:
  BUILD done → +3 pts
  SHOW done  → +2 pts
  EARN done  → +2 pts
  SYSTEMIZE done → +2 pts
  Deep focus (>4 hrs) → +1 pt

Daily: 0-10 score
Weekly: Average of 7 days
Monthly: Trend + insights
```

### 4. AI Coach Agent

- Daily insight (morning)
- Weekly report (Sunday)
- Chat interface (real-time)
- Pattern detection (via pgvector)
- Warnings: *"You skipped EARN 3x this week"*

### 5. Memory System (pgvector)

- Store daily log embeddings
- Retrieve similar patterns
- Smarter AI feedback
- Cross-session personalization

### 6. Analytics Dashboard

- Daily score trend (line chart)
- Pillar breakdown (pie chart)
- Weekly activity (bar chart)
- Streak calendar (heatmap)
- Consistency score

### 7. Gamification

| XP | Action |
|----|-------|
| +30 | BUILD completed |
| +20 | SHOW completed |
| +20 | EARN completed |
| +20 | SYSTEMIZE completed |

| Level | XP Range |
|-------|---------|
| Beginner | 0-30 |
| Builder | 31-60 |
| Operator | 61-120 |
| Beast Mode | 120+ |

---

## Technical Architecture

### Database Schema (PostgreSQL/Supabase)

```sql
-- Users
users                  id, email, name, timezone, phase, coaching_style,
                       wake_time, sleep_time, hours_available,
                       onboarding_complete, created_at

-- Auth
auth                  user_id, provider, provider_id

-- Pillar Goals
pillar_goals           user_id, pillar(B/S/E/S), goal_90day, target_content,
                       target_income, created_at

-- Daily Logs
daily_logs            user_id, date, build_done, show_done, earn_done,
                       systemize_done, build_hours, score,
                       reflection, created_at

-- Tasks (AI-generated)
tasks                 user_id, date, pillar, label, completed,
                       generated_by, created_at

-- XP / Levels
user_stats            user_id, xp, level, streak_current,
                       streak_longest, last_log_date

-- Memory (pgvector)
memories              user_id, date, content, embedding,
                       created_at

-- Conversations
ryna_conversations    user_id, date, messages(jsonb)

-- Notifications
notification_prefs   user_id, morning_brief_time, evening_reminder,
                       weekly_report, streak_alerts
```

### Backend API (FastAPI)

```
/api/v1/
  auth/
    POST /signup
    POST /login
    GET  /me
    POST /oauth/google

  onboarding/
    POST /save-step
    POST /complete

  daily/
    GET  /today
    POST /log-day
    GET  /history?days=7

  tasks/
    GET  /generate
    POST /regenerate
    PATCH /:id

  ai/
    POST /chat
    GET  /insight
    GET  /weekly-report

  analytics/
    GET  /summary
    GET  /trends
    GET  /heatmap

  stats/
    GET  /xp-level
    GET  /streak
    POST /streak/check

  memory/
    POST /store
    GET  /patterns
```

### Frontend (Next.js 14)

```
/app
  /page.tsx              → Marketing (SEO)
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(onboarding)
    /onboarding/page.tsx
  /(dashboard)
    /layout.tsx
    /page.tsx            → Daily Execution Panel
    /tasks/page.tsx
    /analytics/page.tsx
    /history/page.tsx
    /settings/page.tsx
  /api/
    [...routes]
```

### AI Stack

| Task | Model |
|------|-------|
| Task Generation | deepseek/deepseek-r1-0528 |
| Daily Insight | llama-3.1-8b-instruct |
| Chat | moonshotai/kimi-k2.5 |
| Weekly Report | google/gemini-2.5-pro-exp |
| Memory | Mem0 Cloud |

---

## Monetization

```
─────────────────────────────────────────────
  FREE           forever free
─────────────────────────────────────────────
  · 4-pillar daily tasks
  · Basic scoring
  · 7-day history
  · AI chat (10 msgs/day)
  · No reports

─────────────────────────────────────────────
  PRO — $9/mo
─────────────────────────────────────────────
  · Unlimited history
  · AI Task Generator
  · Unlimited AI chat
  · Weekly AI report
  · Memory system
  · Analytics dashboard
  · Priority support

─────────────────────────────────────────────
  TEAM — $29/mo
─────────────────────────────────────────────
  · Everything Pro
  · Up to 3 team members
  · Group challenges
  · Team leaderboard
```

---

## Build Phases

### Phase 1 — Foundation (Week 1-2)

- [ ] Next.js 14 setup + TypeScript + Tailwind
- [ ] Supabase project + Auth
- [ ] Onboarding flow (5 steps)
- [ ] Login/Signup pages
- [ ] Protected routes

### Phase 2 — Core Execution (Week 3-4)

- [ ] Daily Execution Panel
- [ ] AI Task Generator
- [ ] Scoring system
- [ ] XP + Levels
- [ ] Streak tracking

### Phase 3 — AI Layer (Week 5-6)

- [ ] AI Coach chat
- [ ] Daily insight
- [ ] Memory system (pgvector)
- [ ] Weekly report

### Phase 4 — Analytics (Week 7)

- [ ] Dashboard charts
- [ ] Trend analysis
- [ ] Heatmap calendar

### Phase 5 — Monetization (Week 8)

- [ ] Paystack integration
- [ ] Feature gating
- [ ] Billing page

---

## Key Decisions

| Decision | Choice |
|----------|-------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | OpenRouter |
| Memory | pgvector + Mem0 |
| Styling | TailwindCSS + Framer Motion |
| State | Zustand |
| Charts | Recharts |

---

*Last updated: 2026-04-20*
*Built by Samuel Ayomide*
## 2-Week Production Sprint (Outline)
- Objective: Prepare and stabilize the web app (desktop-first) with email-only auth, production CI/CD, and a clean deployment path to Vercel + Railway.
- Timeline: 14 days, with daily commits and weekly review.
- Deliverables:
- Persistent env templates and production-ready secrets strategy
- Email-only auth wired via Supabase
- UI polish and responsive desktop-first layout
- API surface stabilized for production (auth, daily tasks, analytics, goals)
- Push notification scaffolding (web notifications)
- Basic voice capture and notes scaffold (feature flag)
- CI/CD skeleton and deployment docs
- Branding assets (logo) and design tokens

Roadmap alignment with PLAN.md: PLAN.md will reflect this sprint, and both PLAN and PLAN_v2 will stay in sync.

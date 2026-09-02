# GoalFlow v2 — AI Execution OS (Updated)

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
| **Platform** | Web (React + Vite), Mobile (React Native) — shared backend |

---

## Tech Stack (Updated)

| Layer | Technology |
|-------|-------------|
| **Web Frontend** | React 19 + TypeScript + Vite 7 + Tailwind CSS v4 |
| **Mobile Frontend** | React Native 0.74+ + Expo SDK 51+ |
| **Backend** | FastAPI (Python) + Supabase (PostgreSQL + Auth + pgvector) |
| **AI** | OpenRouter (moonshotai/kimi-k2.5, deepseek-r1, etc.) |
| **State** | Zustand v5 (web), React Query (web), AsyncStorage (mobile) |
| **Charts** | Recharts (web), Victory Native XL + Skia (mobile) |
| **Motion** | Framer Motion (web), React Native Reanimated (mobile) |
| **Routing** | React Router DOM v7 (web), Expo Router (mobile) |
| **UI** | Custom design system — warm charcoal (#0c0b09), acid lime (#d4f53c) |

---

## The 4 Pillars + Life Categories

Every day, the user focuses on:

| Pillar | Definition | Daily Actions |
|--------|-----------|-------------|
| **BUILD** | Skill development, product building, learning | Code, study, practice |
| **SHOW** | Content creation, visibility, reach | Post, engage, publish |
| **EARN** | Revenue activities, client acquisition | Outreach, closes, sales |
| **SYSTEMIZE** | Automation, process improvement, delegation | Document, automate, delegate |

### Life Categories (Complete Person Framework)
Users can also select life categories that map to pillars:
- Spiritual (maps to any pillar) — prayer, meditation
- Physical — exercise, health, nutrition
- Financial — income, savings, investing
- Mental — reading, courses, therapy
- Social — relationships, networking
- Career/Work — 9-5 performance
- Creative — art, design, side projects
- Learning — certifications, books
- Purpose — vision, values, legacy

---

## Onboarding Flow (5 Steps + Chat Mode)

```
Step 1 — Identity
  · Full name
  · Email + password (Supabase Auth)
  · Google OAuth (Phase 2)
  · Occupation (with presets: Developer, Designer, Founder, Student, etc.)
  · Timezone (includes Africa/Lagos, Africa/Nairobi, etc.)
  · Weekly hours available

Step 2 — Pillars
  · Tap-to-select from BUILD, SHOW, EARN, SYSTEMIZE
  · Add custom pillars (optional)
  · Each pillar gets a color, icon, description

Step 3 — Life Categories
  · Select which areas of life to develop
  · Maps to pillar system
  · Enable/disable individual categories

Step 4 — Goals (90-Day Sprint)
  · What's your single biggest goal?
  · Per-pillar 90-day goals
  · Goal types: Outcome, Learning, Certification, Habit, Project
  · Target date, milestones, weekly KPIs

Step 5 — Schedule
  · Wake time / Sleep time
  · Deep work windows (add/remove)
  · 9-to-5 status (affects default schedule)

Step 6 — Coach Style
  · Drill Sergeant (strict, high accountability)
  · Wise Mentor (strategic, pattern recognition)
  · High Energy (momentum-first, cheerleader)
  · Cold Strategist (data-driven, optimize)
  · Stoic (meaning over metrics)

Alternate: **Chat Onboarding** — Ryna guides you through all steps via chat interface

↓

AI generates:
  · Personalized Day 1 plan with 24h time blocks
  · First week's task allocation
  · Pillar goals linked to daily execution
```

---

## Core Features (Aligned with Real GoalFlow Frontend)

### 1. Landing Page
- Hero section with animated ticker
- Pillar framework explanation
- Feature breakdown (01-06)
- Cross-platform section (Web, iOS, Android)
- Security section (RLS, JWT, encryption)
- Testimonials
- App store badges (coming soon)
- Footer with legal links

### 2. Authentication
- Email/password signup and login
- Form and chat onboarding modes
- Protected routes with auth guards
- Supabase Auth integration
- JWT + refresh token rotation
- Biometric auth (mobile — Face ID / Fingerprint)

### 3. Dashboard (Today Execution Panel)
```
Main dashboard showing today's execution:

[ KPI Strip ]
  Score Gauge (0-10 semicircle)
  Streak Counter (days)
  Completion %

[ Pillar Grid ]  2×2 cards
  [ BUILD ]  [ SHOW ]
  [ EARN ]   [ SYSTEMIZE ]
  · Completion % per pillar
  · Segmented progress bars

[ Task List ]
  · Filter by pillar + status (All/Pending/Done/Skipped)
  · Inline task editor (title, description, time allocation)
  · Sync to Day Planner on time slot change
  · AI-generated badge + context tooltip
  · Swipe-right to complete, swipe-left to delete (mobile)

[ Build Hours ]
  · Slider (0-12h, 0.5h steps)
  · Visual feedback: <2h, 2-4h, 4h+

[ Daily Reflection ]
  · Collapsible panel
  · Fields: What I accomplished, What blocked me, What I'm grateful for, Tomorrow's focus
```

### 4. 24-Hour Day Planner
```
Vertical scrollable timeline (24h):

[ Header ]
  · Current block indicator (pulsing dot + label)
  · Next block chip
  · Reshuffle FAB

[ Timeline ]
  · Hour markers (00:00 - 24:00)
  · Color-coded blocks (sleep, spiritual, exercise, transit, deep work, meals, admin, show, earn, buffer, personal)
  · NOW line (acid lime, auto-scroll to current time)
  · Block categories with priority levels (fixed, high, medium, low)
  · Flexible vs fixed blocks
  · User-editable blocks

[ Block Detail ] (tap/click)
  · Inline editor: label, start time, duration, category, flexible toggle, notes
  · Save & sync to task list
  · Delete block

[ AI Reshuffle ]
  · POST /api/v1/planner/reshuffle
  · Rules: protect sleep (6h min), protect spiritual, compress buffers first
  · Explains all changes to user
  · User can reject individual changes

[ Time Allocation Summary ] (right panel / bottom sheet)
  · Per-category minutes and %
  · Life KPIs
  · Ryna advice
```

**Default Ideal Day Template:**
```
00:00 – 06:00  Sleep (6h)                 [FIXED]
06:00 – 06:30  Morning Prayer (30m)        [HIGH · NON-FLEXIBLE]
06:30 – 06:50  Bible Reading (20m)         [HIGH · SEMI-FLEXIBLE]
06:50 – 07:35  Exercise / Gym (45m)        [HIGH · FLEXIBLE]
07:35 – 08:00  Shower & Prep (25m)         [FIXED]
08:00 – 08:20  Breakfast (20m)             [MEDIUM · FLEXIBLE]
08:20 – 09:05  Transit to Office (45m)     [FIXED]
09:05 – 10:35  Deep Work — BUILD (90m)     [HIGH · FLEXIBLE TIME]
10:35 – 11:05  Admin / Standup (30m)       [MEDIUM · SEMI-FIXED]
11:05 – 12:35  Deep Work — BUILD (90m)     [HIGH · FLEXIBLE TIME]
12:35 – 13:20  Lunch (45m)                 [MEDIUM · FLEXIBLE]
13:20 – 13:50  SHOW — Post & Engage (30m)  [HIGH · FLEXIBLE]
13:50 – 14:50  Deep Work — EARN (60m)      [HIGH · FLEXIBLE]
14:50 – 15:20  Buffer / Catch-up (30m)     [LOW · FIRST TO COMPRESS]
15:20 – 16:05  Transit Home (45m)          [FIXED]
16:05 – 16:25  Evening Prayer (20m)        [HIGH · NON-FLEXIBLE]
16:25 – 17:10  SYSTEMIZE (45m)             [MEDIUM · FLEXIBLE]
17:10 – 18:10  Dinner & Family (60m)       [FIXED]
18:10 – 18:40  Wind Down / Read (30m)      [MEDIUM · FLEXIBLE]
23:00 – 06:00  Sleep (7h)                  [FIXED]
```

### 5. Task Management
- AI-generated tasks (per pillar, with time slots)
- Manual add with pillar selection, description, time allocation
- Task-to-Planner sync (auto-creates time block)
- Filters: pillar + status
- Goal-to-Task Intelligence: Ryna spreads 90-day goals across daily tasks
- Inline editing (title, description, start time, duration)
- Pomodoro presets (25m, 45m, 60m, 90m)
- Completion toggle with haptic feedback (mobile)
- Delete with confirmation

### 6. Goals (90-Day Sprint)
```
[ Goals Grid ]
  · Per-pillar goal cards
  · Progress bar (0-100%)
  · Days remaining countdown
  · Milestone tracking (completed/total)

[ Goal Detail ] (expand/stack push)
  · Title, description, target date
  · Progress slider (syncs with backend)
  · Milestones list (toggle complete)
  · Weekly plan (AI-generated)
  · Edit plan button

[ AI Goal Planner Chat ]
  · Embedded chat at bottom of goals page
  · Ask Ryna to review goals, suggest milestones, plan week's execution
  · Quick action chips
```

**Goal Types:**
- Outcome Goal (specific result: revenue, followers, etc.)
- Learning Goal (skill or knowledge area)
- Certification Goal (formal credential)
- Habit Goal (daily/weekly behavior)
- Project Goal (specific deliverable)

### 7. Analytics Dashboard
```
[ Tabs ] OVERVIEW | PERFORMANCE | PILLARS

[ KPI Strip ]
  · Current Score (/10)
  · Streak (days)
  · Build Hours This Week
  · Tasks Completed (all time)

[ OVERVIEW Tab ]
  · Score Trend (14-day line chart)
  · Pillar Distribution (pie chart)
  · Build Hours Bar Chart (14-day)

[ PERFORMANCE Tab ]
  · Weekly Report (AI-generated)
  · Highlights + Improvements lists
  · Ryna's Weekly Insight
  · Tasks/Day horizontal bar chart

[ PILLARS Tab ]
  · Per-pillar completion % cards
  · Score + Build Hours combined trend line
```

### 8. Leaderboard
```
[ Tabs ] THIS WEEK | ALL TIME | STREAK

[ Podium ] Top 3 visual display
  · Avatar with level badge
  · Name, level, score/streak/XP
  · Crown icon for #1

[ Full Leaderboard ]
  · Rank, Avatar, Name, Level, Streak, Score, XP
  · Current user highlighted with acid border
  · Filter by weekly score, all-time XP, or streak

[ Your Position Summary ]
  · Rank #, streak, XP
  · XP to next rank
  · Badges earned display
```

### 9. Ryna AI Coach (Full Integration)
```
[ Chat Interface ] (full-screen modal / stack push)
  · Header: Ryna branding + coach style indicator + pulse dot
  · Minimizable (sticky FAB on mobile)
  · Message bubbles: user (acid tint) vs assistant (raised bg + aqua left border)
  · Mono "RYNA" label above each AI message
  · Typing indicator (3 bouncing dots)

[ Quick Action Chips ] (above input)
  · Plan my day
  · Reshuffle day
  · I'm stuck
  · Add a task
  · Content idea
  · Cold email
  · Week review
  · Switch coach

[ MCP Actions ] (AI can execute tasks)
  · add_task — adds task to today + planner
  · complete_task — marks task done
  · skip_task — skips with reason
  · reshuffle_day — AI reshuffles timeline
  · change_task_time — reschedules
  · generate_tasks — AI creates daily tasks
  · add_goal — creates new goal
  · update_goal_progress — updates %
  · switch_coach_style — changes coaching
  · draft_cold_email — writes outreach
  · draft_dm — social DM draft

[ Coach Style Switcher ]
  · 5 styles with symbols
  · Changes AI's tone and advice pattern
  · Triggers: low discipline, new user, high performer, burnout risk
```

### 10. Settings
```
[ Tabs ] PROFILE | NOTIFICATIONS | APPEARANCE | SECURITY

[ PROFILE ]
  · Avatar (square, level color bg)
  · Name, email, occupation, timezone
  · Level display with XP progress bar
  · Level roadmap (all 8 levels)
  · Stats: streak, best streak, tasks done, weekly score
  · Badges earned (with rarity: common, rare, epic, legendary)
  · Edit fields with save button
  · Coach style selector

[ NOTIFICATIONS ]
  · Push notifications toggle
  · Per-type toggles:
    - Morning Briefing (time picker)
    - Block Transitions (5min before each block)
    - Task Reminders (during deep work)
    - Ryna Coach Nudges (when off-track)
    - Evening Reflection (time picker)
    - Weekly Report (Sunday)
  · Time pickers for briefing and reflection

[ APPEARANCE ]
  · Accent color picker (acid lime, ember, aqua, gold, purple, pink)
  · App version display

[ SECURITY ]
  · Change password (current, new, confirm)
  · Active sessions display
  · Sign out all sessions button
  · Delete account (danger zone)
```

### 11. Gamification (Level System)
| Level | XP Range | Label | Color |
|-------|---------|-------|-------|
| 1 | 0-499 | INITIATE | #5a5448 |
| 2 | 500-1199 | BUILDER | #7b8fa8 |
| 3 | 1200-2499 | EXECUTOR | #60a5fa |
| 4 | 2500-4499 | OPERATOR | #a78bfa |
| 5 | 4500-7499 | STRATEGIST | #00d4b4 |
| 6 | 7500-11999 | ARCHITECT | #f5c842 |
| 7 | 12000-19999 | SOVEREIGN | #ff6b35 |
| 8 | 20000+ | LEGEND | #d4f53c |

**Badges:**
| Badge | Description | Rarity |
|--------|-------------|--------|
| First Step | Completed first task | Common |
| 7-Day Warrior | 7-day streak | Common |
| Iron Discipline | 30-day streak | Rare |
| Goal Setter | Set first 90-day goal | Common |
| Goal Crusher | Completed a goal | Epic |
| Deep Worker | 100h deep work | Rare |
| Full Stack Human | All 4 pillars in one day | Epic |
| Top 10 | Top 10 on leaderboard | Legendary |
| Consistent | 90% completion for 2 weeks | Rare |
| Spiritual | 30 consecutive spiritual blocks | Rare |

**XP per Action:**
- BUILD task completed: +30 XP
- SHOW task completed: +20 XP
- EARN task completed: +20 XP
- SYSTEMIZE task completed: +20 XP
- Deep work hour: +10 XP
- Goal milestone: +100 XP
- Goal complete: +500 XP
- 7-day streak: +200 XP
- 30-day streak: +1000 XP

---

## AI Architecture (OpenRouter)

| Task | Model | Purpose |
|------|-------|---------|
| Task Generation | moonshotai/kimi-k2.5 | Daily tasks per pillar, time allocation |
| Daily Insight | llama-3.1-8b-instruct (or Kimi) | Morning briefing |
| Chat | moonshotai/kimi-k2.5 | Real-time coaching conversations |
| Weekly Report | google/gemini-2.5-pro-exp | Deep analysis + insights |
| Goal Planning | deepseek/deepseek-r1-0528 | 90-day breakdown |
| Memory | pgvector (Supabase) + Mem0 Cloud | Contextual personalization |

**Ryna Context Injection:**
- User's goals + progress
- Current streak + score
- Today's tasks + completion
- Past 7 days patterns
- Blocked areas (avoidance patterns)
- Coach style preference

---

## Backend Architecture (FastAPI + Supabase)

### Database Schema (PostgreSQL/Supabase)

```sql
-- Users (extends Supabase auth.users)
user_profiles
  id UUID REFERENCES auth.users PRIMARY KEY
  name TEXT NOT NULL
  email TEXT UNIQUE NOT NULL
  timezone TEXT DEFAULT 'Africa/Lagos'
  occupation TEXT
  weekly_hours INTEGER DEFAULT 40
  avatar_url TEXT
  level INTEGER DEFAULT 1
  xp INTEGER DEFAULT 0
  streak INTEGER DEFAULT 0
  longest_streak INTEGER DEFAULT 0
  onboarding_complete BOOLEAN DEFAULT FALSE
  onboarding_mode TEXT DEFAULT 'form'
  coach_style TEXT DEFAULT 'strategist'
  has_9_to_5 BOOLEAN DEFAULT FALSE
  work_start_time TIME
  work_end_time TIME
  total_tasks_completed INTEGER DEFAULT 0
  weekly_score DECIMAL(3,1) DEFAULT 0
  created_at TIMESTAMP DEFAULT NOW()

-- Pillars (user-customizable)
pillars
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  pillar_id TEXT NOT NULL -- 'BUILD', 'SHOW', etc.
  label TEXT NOT NULL
  description TEXT
  color TEXT
  icon TEXT
  enabled BOOLEAN DEFAULT TRUE
  categories TEXT[]
  weekly_kpis TEXT[]
  UNIQUE(user_id, pillar_id)

-- Categories (life categories)
categories
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  category_id TEXT NOT NULL
  label TEXT NOT NULL
  description TEXT
  icon TEXT
  color TEXT
  enabled BOOLEAN DEFAULT TRUE
  pillar_id TEXT
  UNIQUE(user_id, category_id)

-- Goals (90-day sprints)
goals
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  pillar_id TEXT NOT NULL
  category_id TEXT
  title TEXT NOT NULL
  description TEXT
  target_date DATE NOT NULL
  status TEXT DEFAULT 'active' -- active, completed, paused, at-risk
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
  goal_type TEXT -- outcome, learning, certification, habit, project
  weekly_kpis TEXT[]
  weekly_plan TEXT
  strategy TEXT
  created_at TIMESTAMP DEFAULT NOW()

-- Milestones
milestones
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE
  title TEXT NOT NULL
  due_date DATE
  completed BOOLEAN DEFAULT FALSE
  completed_at TIMESTAMP

-- Daily Logs
daily_logs
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  date_key DATE NOT NULL
  build_hours DECIMAL(4,1) DEFAULT 0
  score DECIMAL(3,1) DEFAULT 0
  reflection_accomplished TEXT
  reflection_blocked TEXT
  reflection_grateful TEXT
  reflection_tomorrow_focus TEXT
  pillar_completion JSONB -- {BUILD: true, SHOW: false, ...}
  updated_at TIMESTAMP DEFAULT NOW()
  UNIQUE(user_id, date_key)

-- Tasks
tasks
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  date_key DATE NOT NULL
  pillar_id TEXT NOT NULL
  category_id TEXT
  title TEXT NOT NULL
  description TEXT
  estimated_minutes INTEGER
  actual_minutes INTEGER
  status TEXT DEFAULT 'pending' -- pending, in-progress, completed, skipped
  is_ai_generated BOOLEAN DEFAULT FALSE
  start_time TIME
  end_time TIME
  ai_context TEXT
  created_at TIMESTAMP DEFAULT NOW()
  completed_at TIMESTAMP

-- Time Blocks (24h planner)
time_blocks
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  date_key DATE NOT NULL
  label TEXT NOT NULL
  category TEXT NOT NULL
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440)
  duration_minutes INTEGER NOT NULL
  pillar_id TEXT
  completed BOOLEAN DEFAULT FALSE
  skipped BOOLEAN DEFAULT FALSE
  flexible BOOLEAN DEFAULT TRUE
  priority TEXT DEFAULT 'medium' -- fixed, high, medium, low
  user_editable BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at TIMESTAMP DEFAULT NOW()

-- XP / Levels / Badges
user_stats
  user_id UUID REFERENCES user_profiles(id) PRIMARY KEY
  xp INTEGER DEFAULT 0
  level INTEGER DEFAULT 1
  streak_current INTEGER DEFAULT 0
  streak_longest INTEGER DEFAULT 0
  last_log_date DATE
  weekly_score DECIMAL(3,1)

badges
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  badge_id TEXT NOT NULL
  earned_at TIMESTAMP DEFAULT NOW()
  UNIQUE(user_id, badge_id)

-- Memory (pgvector for Ryna AI)
memories
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  date_key DATE NOT NULL
  content TEXT NOT NULL
  embedding VECTOR(1536) -- OpenAI embeddings or equivalent
  created_at TIMESTAMP DEFAULT NOW()

-- Conversations (Ryna chat history)
ryna_conversations
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  date_key DATE NOT NULL
  messages JSONB NOT NULL -- [{role, content, timestamp, quickActions}]
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

-- Notifications
notification_prefs
  user_id UUID REFERENCES user_profiles(id) PRIMARY KEY
  push_enabled BOOLEAN DEFAULT FALSE
  morning_briefing BOOLEAN DEFAULT TRUE
  morning_time TIME DEFAULT '07:00'
  evening_reflection BOOLEAN DEFAULT TRUE
  evening_time TIME DEFAULT '21:00'
  task_reminders BOOLEAN DEFAULT TRUE
  block_transitions BOOLEAN DEFAULT TRUE
  coach_nudges BOOLEAN DEFAULT TRUE
  weekly_report BOOLEAN DEFAULT TRUE

notifications
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE
  type TEXT NOT NULL -- start, end, warning, reshuffle, info, achievement, coach
  title TEXT NOT NULL
  message TEXT NOT NULL
  time TEXT
  dismissed BOOLEAN DEFAULT FALSE
  action_label TEXT
  mcp_action JSONB
  created_at TIMESTAMP DEFAULT NOW()

-- Leaderboard (materialized view or computed)
leaderboard
  user_id UUID REFERENCES user_profiles(id) PRIMARY KEY
  name TEXT
  avatar_initial TEXT
  level INTEGER
  xp INTEGER
  streak INTEGER
  weekly_score DECIMAL(3,1)
  rank INTEGER
  pillars TEXT[]
  occupation TEXT
  badge TEXT
```

### Backend API (FastAPI — to be built)

```
/api/v1/
  auth/
    POST /signup              → { user, accessToken, refreshToken }
    POST /login               → { user, accessToken, refreshToken }
    POST /refresh             → { accessToken, refreshToken }
    GET  /verify              → { user } | 401
    POST /logout             → 200

  onboarding/
    POST /save-step          → 200 (step, data)
    POST /complete           → { user, firstWeekPlan }
    GET  /status             → { complete: boolean, step: number }

  daily/
    GET  /today              → DailyData
    POST /log                → DailyData (upsert)
    GET  /history?days=7     → DailyData[]
    GET  /streak             → { current, longest, lastDate }

  tasks/
    GET  /                   → Task[]
    GET  /generate           → Task[] (AI-generated with time slots)
    POST /                   → Task (manual add)
    PATCH /:id              → Task (update)
    DELETE /:id             → 204
    POST /spread-goals       → Task[] (spread goals across days)

  planner/
    GET  /?date=YYYY-MM-DD  → TimeBlock[]
    PUT  /                   → TimeBlock[] (save all blocks)
    POST /reshuffle         → { blocks, changes, explanation }
    PATCH /:id             → TimeBlock (update single)

  goals/
    GET  /                   → Goal[]
    POST /                  → Goal
    PATCH /:id             → Goal
    DELETE /:id            → 204
    GET  /:id/milestones   → Milestone[]

  analytics/
    GET  /summary            → KPISummary
    GET  /history?days=14   → HistoryEntry[]
    GET  /trends             → { scoreTrend, hoursTrend, pillarTrend }
    GET  /heatmap            → { date, score }[] (90 days)
    GET  /pillars            → PillarStats[]

  ryna/
    POST /chat               → { reply, quickActions, mcpAction? }
    GET  /history            → ChatMessage[]
    GET  /insight            → { insight, nextWeekFocus }
    GET  /weekly-report      → WeeklyReport
    POST /switch-style       → { user } (change coach style)

  memory/
    POST /store             → 201 (store embedding)
    GET  /patterns?limit=5  → { patterns: string[] }
    GET  /search?q=...      → { results: Memory[] }

  notifications/
    GET  /prefs             → NotificationPreferences
    PUT  /prefs             → NotificationPreferences
    POST /register          → 201 (push token)
    DELETE /register        → 204

  leaderboard/
    GET  /?tab=weekly       → LeaderboardEntry[]
    GET  /me                → { rank, xpToNext, totalUsers }

  stats/
    GET  /xp-level          → { xp, level, xpForNextLevel }
    GET  /badges            → Badge[]
    POST /award-badge      → 201 (internal)
```

### Backend File Structure (to be built)
```
backend/
├── main.py                 # FastAPI app, CORS, middleware
├── config.py               # Settings with OpenRouter + Supabase config
├── models.py               # Pydantic v2 models for all data
├── requirements.txt         # fastapi, uvicorn, httpx, pydantic, supabase, pgvector, etc.
├── deps.py                 # Dependency injection (get_db, get_current_user)
├── routers/
│   ├── auth.py          # Signup, login, refresh, verify, logout
│   ├── onboarding.py    # Save step, complete
│   ├── daily.py         # Today, log, history, streak
│   ├── tasks.py         # CRUD, generate (AI), spread goals
│   ├── planner.py       # Time blocks, reshuffle (AI)
│   ├── goals.py         # CRUD, milestones
│   ├── analytics.py     # Summary, history, trends, heatmap
│   ├── ryna.py          # Chat (AI), insight, weekly report, switch style
│   ├── memory.py        # pgvector store, search, patterns
│   ├── notifications.py # Prefs, register push token
│   ├── leaderboard.py   # Rankings, user position
│   └── stats.py         # XP, levels, badges
├── services/
│   ├── supabase.py      # Supabase client wrapper
│   ├── openrouter.py    # OpenRouter API calls
│   ├── ryna.py          # AI coach logic, context building, MCP actions
│   ├── reshuffle.py     # Day planner reshuffle algorithm
│   ├── scoring.py       # Daily score, XP, level calculations
│   ├── badges.py        # Badge award logic
│   └── notifications.py # Push notification scheduling
└── utils/
    ├── auth.py          # JWT creation, verification, refresh
    ├── timeblocks.py     # Time block helpers, NOW line, default day
    └── validators.py    # Input validation helpers
```

---

## Mobile App (React Native + Expo)

### Architecture (Shared Backend, Native Client)
```
┌─────────────────────────────────────────────────┐
│                  GoalFlow Backend                │
│  Supabase (PostgreSQL + Auth + RLS + pgvector)  │
│  FastAPI (Python) — business logic            │
│  OpenRouter — AI models (Kimi, DeepSeek)      │
│  Expo Push Service — notifications           │
└──────────────┬───────────────────┬────────────┘
               │                   │
    ┌──────────▼──────┐   ┌────▼──────────┐
    │   Web App       │   │   Mobile App      │
    │  React + Vite   │   │  React Native   │
    │  Tailwind CSS   │   │  Expo SDK 51+   │
    │  Browser push   │   │  Expo Notifs    │
    └─────────────────┘   └──────────────────┘
```

### Mobile Navigation (Expo Router)
```
app/
├── _layout.tsx              # Root layout — fonts, safe area, store
├── index.tsx                # Landing / auth gate
├── onboarding/
│   └── [step].tsx           # Steps 1–6 + chat mode
├── (tabs)/                  # Main app — bottom tab navigator
│   ├── _layout.tsx          # Tab bar definition
│   ├── today/
│   │   ├── index.tsx        # Today Dashboard
│   │   └── reflection.tsx   # Reflection modal (stack)
│   ├── planner/
│   │   └── index.tsx        # Day Planner — 24h timeline
│   ├── tasks/
│   │   └── index.tsx        # Tasks list
│   ├── goals/
│   │   ├── index.tsx        # Goals list
│   │   └── [id].tsx         # Goal detail (stack push)
│   ├── analytics/
│   │   └── index.tsx        # Analytics
│   └── settings/
│       └── index.tsx        # Settings
└── ryna.tsx                 # Ryna chat — full-screen modal
```

### Mobile-Specific Features
- **Push Notifications:** Block start/end, streak risk, morning briefing, evening reflection
- **Glanceable Widgets:** (iOS/Android home screen) today's score, current block, streak
- **Background Sync:** Planner and tasks stay current even when app is closed
- **Offline-First:** Full day planning works without internet; syncs on reconnect
- **Biometric Auth:** Face ID / fingerprint for instant secure access
- **Haptic Feedback:** Task complete (success), task delete (warning), block skip (medium), reshuffle (heavy), button press (light)
- **Swipe Gestures:** Task complete (right, green flash), task delete (left, red flash)
- **Bottom Sheets:** Block detail, add task, goal detail (instead of modals)

---

## Development Phases (Updated)

### Phase 1 — Backend Foundation (Week 1-2)
- [ ] Supabase project setup + RLS policies
- [ ] Run database migrations (all tables from schema above)
- [ ] FastAPI project scaffold (main.py, config.py, models.py)
- [ ] Supabase client wrapper (services/supabase.py)
- [ ] Auth endpoints (signup, login, refresh, verify)
- [ ] JWT middleware (deps.py, utils/auth.py)
- [ ] CORS config for web (localhost:5173) and mobile

### Phase 2 — Web Frontend Integration (Week 3-4)
- [ ] Replace all mock data in store.ts with real API calls
- [ ] Connect auth (signup, login, logout) to Supabase Auth
- [ ] Wire dashboard to /api/v1/daily endpoints
- [ ] Wire tasks to /api/v1/tasks endpoints
- [ ] Wire planner to /api/v1/planner endpoints
- [ ] Wire goals to /api/v1/goals endpoints
- [ ] Wire analytics to /api/v1/analytics endpoints
- [ ] Wire leaderboard to /api/v1/leaderboard endpoints
- [ ] Wire settings to /api/v1/notifications/prefs
- [ ] Connect Ryna chat to /api/v1/ryna/chat (OpenRouter)
- [ ] Add protected route checks (JWT verification)
- [ ] Add error handling + loading states for all API calls
- [ ] Test full flow: signup → onboarding → dashboard

### Phase 3 — AI Layer (Week 5-6)
- [ ] OpenRouter integration (config.py, services/openrouter.py)
- [ ] Ryna chat endpoint (/api/v1/ryna/chat)
- [ ] MCP action execution (add_task, reshuffle_day, etc.)
- [ ] Daily insight generation (/api/v1/ryna/insight)
- [ ] Weekly report generation (/api/v1/ryna/weekly-report)
- [ ] AI task generation (/api/v1/tasks/generate)
- [ ] Goal-to-task spreading logic
- [ ] pgvector memory system (memories table)
- [ ] Memory search + pattern detection
- [ ] Coach style adaptation logic

### Phase 4 — Mobile App Scaffold (Week 7-8)
- [ ] Expo project init (expo init, install deps)
- [ ] Port types/index.ts → mobile (identical types)
- [ ] Port lib/store.ts → mobile (Zustand + React Query)
- [ ] Configure Axios with base URL + interceptors
- [ ] Set up Expo Router file structure
- [ ] Configure EAS Build (dev / preview / production)
- [ ] Set up SecureStore for auth tokens
- [ ] Build shared component library (SegBar, Btn, Toggle, etc.)
- [ ] Port all screens: Landing, Auth, Onboarding
- [ ] Port Dashboard, Tasks, Goals, Planner
- [ ] Port Analytics, Leaderboard, Settings
- [ ] Port Ryna Chat with MCP actions

### Phase 5 — Mobile Features + Polish (Week 9-10)
- [ ] Push notification setup (expo-notifications)
- [ ] Register push tokens on server
- [ ] Notification handlers (10+ trigger types)
- [ ] Background fetch for day notifications
- [ ] Biometric auth (expo-local-authentication)
- [ ] Haptic feedback (expo-haptics)
- [ ] Swipeable task cards (react-native-gesture-handler)
- [ ] Victory Native XL charts (replace Recharts)
- [ ] Offline persistence (AsyncStorage + React Query)
- [ ] Widgets (expo-widgets) — iOS + Android
- [ ] Test on physical devices (iOS + Android)

### Phase 6 — Monetization (Week 11-12)
- [ ] Paystack integration (payments for Nigerian market)
- [ ] Feature gating (free vs pro vs team)
- [ ] Billing page in settings
- [ ] Webhook handlers for payment events
- [ ] Subscription status in user profile
- [ ] Team tier (up to 3 members, group challenges)

---

## Monetization (Aligned with Nigerian Market)

```
┌────────────────────────────────────────────
  FREE           forever free
├────────────────────────────────────────────
  · 4-pillar daily tasks
  · Basic scoring
  · 7-day history
  · AI chat (10 msgs/day)
  · No reports

├────────────────────────────────────────────
  PRO — $9/mo  (~₦14,000/mo)
├────────────────────────────────────────────
  · Everything Free
  · Unlimited history
  · AI Task Generator
  · Unlimited AI chat
  · Weekly AI report
  · Memory system (pgvector)
  · Analytics dashboard
  · Leaderboard access
  · Priority support

├────────────────────────────────────────────
  TEAM — $29/mo  (~₦45,000/mo)
├────────────────────────────────────────────
  · Everything Pro
  · Up to 3 team members
  · Group challenges
  · Team leaderboard
  · Shared goals
```

---

## Nigeria Market Considerations (Built-In)
- **Payments:** Paystack integration (not Stripe)
- **Messaging:** WATI for WhatsApp, Termii for SMS
- **Phone validation:** Nigerian format (+234)
- **Content:** Local languages support (Yoruba, Igbo, Hausa) — Phase 2
- **Network:** Minimize payload sizes for expensive data plans
- **Timezones:** Africa/Lagos default, but supports all African timezones

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| **Web Frontend** | Vercel | `vercel.json` in Real GoalFlow/ |
| **Backend API** | Railway | `railway.json` in backend/ |
| **Database** | Supabase Cloud | Free tier: 500MB PG, pgvector enabled |
| **Mobile (iOS)** | TestFlight | EAS Build (production profile) |
| **Mobile (Android)** | Play Store | EAS Build (app-bundle) |

### Environment Variables

**Web (.env.local / Vercel):**
```
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=https://goalflow-api.railway.app/api/v1
OPENROUTER_API_KEY=sk-or-v1-...
```

**Backend (.env):**
```
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_KEY=sb_service_...
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=...
PAYSTACK_SECRET_KEY=sk_test_...
```

**Mobile (app.config.js / EAS Secrets):**
```
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=https://goalflow-api.railway.app/api/v1
```

---

## Build Phases Summary

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| 1. Backend Foundation | Week 1-2 | Supabase schema, FastAPI, Auth, JWT |
| 2. Web Integration | Week 3-4 | All pages wired to real API, AI live |
| 3. AI Layer | Week 5-6 | Ryna chat, task gen, memory, reports |
| 4. Mobile Scaffold | Week 7-8 | All screens ported, navigation, store |
| 5. Mobile Features | Week 9-10 | Push, haptics, offline, widgets |
| 6. Monetization | Week 11-12 | Paystack, gating, team tier |

---

## Quality Gates (Before Production)

- [ ] All pages render correctly on desktop (Chrome, Safari, Firefox)
- [ ] All pages render correctly on mobile (iOS Safari, Chrome Android)
- [ ] Offline mode: cached screens work without internet
- [ ] Push notifications: all trigger types fire correctly
- [ ] Auth: signup → onboarding → dashboard flow works end-to-end
- [ ] Biometric: Face ID / fingerprint prompt works
- [ ] Planner: 24h timeline scrolls smoothly at 60fps
- [ ] Ryna chat: keyboard avoidance works on both platforms
- [ ] Swipe gestures: task complete/delete work correctly
- [ ] Reduce Motion: animations disabled when system setting is on
- [ ] pgvector: memory system retrieves relevant context
- [ ] Paystack: payment flow completes successfully
- [ ] Railway: backend deploys without errors
- [ ] Vercel: frontend deploys without errors
- [ ] EAS: mobile builds succeed for iOS and Android

---

*Last updated: 2026-05-02*
*Built by Samuel Ayomide*
*One backend. All clients. Every device.*

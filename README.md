# GoalFlow 🚀

> AI-powered execution OS for high-performers. BUILD. SHOW. EARN. SYSTEMIZE.

## Features

- **4-Pillar Daily Execution** - BUILD, SHOW, EARN, SYSTEMIZE
- **AI Coach (Ryna)** - Chat with AI for goal guidance and task management
- **AI Goals Planner** - Tell AI your goals, it creates a structured plan
- **Analytics Dashboard** - Track progress with charts and insights
- **XP & Level System** - Gamified growth tracking
- **Streak Tracking** - Build consistency with daily streaks

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter (LLM routing)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account

### Installation

```bash
# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env.local
# Fill in your Supabase and OpenRouter keys
```

### Development

```bash
# Frontend (localhost:3010)
npm run dev

# Backend (localhost:8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Build

```bash
npm run build
```

## Project Structure

```
goalflow/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Daily execution (home)
│   ├── login/             # Sign in
│   ├── signup/            # Sign up
│   ├── goals/             # AI goals planner
│   ├── tasks/             # Tasks management
│   ├── analytics/         # Analytics dashboard
│   ├── settings/           # Settings
│   └── onboarding/        # Onboarding flow
├── components/            # React components
├── contexts/              # Auth contexts
├── hooks/                 # Custom hooks
├── lib/                   # Utilities & config
├── store/                 # Zustand state
└── backend/               # FastAPI backend
    └── routers/           # API endpoints
```

## Routes

- `/` - Today's execution panel
- `/login` - Sign in
- `/signup` - Create account
- `/goals` - AI goals planner
- `/tasks` - Tasks management
- `/analytics` - Progress analytics
- `/settings` - App settings
- `/onboarding` - New user setup

## Deployment

### Frontend (Vercel)

```bash
# Push to GitHub, connect to Vercel
vercel deploy --prod
```

### Backend (Railway)

```bash
# Deploy backend folder to Railway
railway deploy
```

## License

MIT
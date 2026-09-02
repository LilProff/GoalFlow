# GoalFlow - UI/UX Redesign Prompt

## Project Overview
**Product**: GoalFlow - AI Execution OS
**Vision**: The AI-powered accountability system for high-performers who want to BUILD, SHOW, EARN, and SYSTEMIZE their lives.
**Target**: Ambitious 18-35 Nigerian/African founders, freelancers, creators, professionals

---

## Brand Identity

### Colors
- **Primary**: `#f59e0b` (Amber-500) - Main accent, CTAs, highlights
- **Background Dark**: `#09090b` (Zinc-950)
- **Background Light**: `#fafafa` (Zinc-50)
- **Card Dark**: `#18181b` (Zinc-900)
- **Text Primary**: `#fafafa` (Zinc-100)
- **Text Secondary**: `#a1a1aa` (Zinc-400)
- **Success**: `#22c55e` (Green-500)
- **Error**: `#ef4444` (Red-500)

### Pillar Colors
- **BUILD**: Blue (`#60a5fa`)
- **SHOW**: Purple (`#a855f7`)
- **EARN**: Green (`#22c55e`)
- **SYSTEMIZE**: Orange (`#fb923c`)

### Typography
- **Font Family**: JetBrains Mono (primary), system-ui (fallback)
- **Headings**: Black, Uppercase, Italic
- **Body**: Regular, 16px base
- **Mono**: For scores, stats, time

---

## Pages & Routes

### 1. Login (`/login`)
- Email input
- Password input
- Sign in button
- "Sign up" link
- Logo branding

### 2. Signup (`/signup`)
- Name input
- Email input
- Password input  
- Create account button
- "Sign in" link

### 3. Today's Execution - HOME (`/`)
**Desktop Layout**:
```
┌─────────────────────────────────────────────────────┐
│ [Logo] GoalFlow              [Streak] [Time] [⚙]  │ HEADER
├─────────────────────────────────────────────────────┤
│                                                     │
│        ┌──────────────────────┐                    │
│        │   SCORE RING (0-10) │                    │  HERO
│        └──────────────────────┘                    │
│                                                     │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│   │ BUILD  │ │ SHOW   │ │ EARN   │ │SYSTEM │      │  4 PILLARS
│   │   ☐    │ │   ☐    │ │   ☐   │ │   ☐   │      │  GRID
│   └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                     │
│        [━━━ Build Hours Slider ━━━]                  │  SLIDER
│                                                     │
│   [Regenerate Tasks]    [Ask Ryna]                   │  ACTIONS
│                                                     │
│   ┌──────────────────────────────────────────┐       │
│   │ Daily Reflection                        │       │  REFLECTION
│   │ [What did I accomplish?]                │       │
│   └──────────────────────────────────────────┘       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Today │ Tasks │ Goals │ Analytics │ Settings       │ FOOTER NAV
└─────────────────────────────────────────────────────┘
```

### 4. Tasks (`/tasks`)
- Generate AI Tasks button
- Task cards grouped by pillar
- Add task input + pillar selector
- Checkbox to complete

### 5. Goals (`/goals`)
- AI Planner toggle
- Chat interface with AI
- Goal cards with:
  - Title
  - Category (SPIRITUAL/PHYSICAL/FINANCIAL/CAREER/PERSONAL)
  - Timeframe (DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY)
  - Target
  - Sub-tasks with checkboxes

### 6. Analytics (`/analytics`)
- Stats grid (Avg Score, Build Hours, Streak, Level)
- 7-day bar chart
- Pillar pie chart
- Weekly AI report card

### 7. Settings (`/settings`)
- Profile card
- Stats summary
- Settings list:
  - Profile
  - Notifications
  - Subscription
  - Dark Mode toggle
  - Sign Out

### 8. Onboarding (`/onboarding`)
- 5-step wizard with progress bar:
  1. Identity (Name, Email, Password, Phase)
  2. 4 Pillars Assessment
  3. 90-Day Goals
  4. Schedule (Wake/Sleep time, Hours available)
  5. Coaching Style (Drill Sergeant/Balanced/Gentle)

---

## UI Components

### Score Ring
- SVG circle with animated progress
- Center: current score /10
- Amber gradient glow

### Pillar Cards
- Border-left colored by pillar
- Checkbox with animated checkmark
- XP badge on completion

### Level Badge
- Pill-shaped badge
- Color coded by level:
  - Beginner: Zinc
  - Builder: Blue
  - Operator: Purple
  - Beast Mode: Amber/Gold

### Streak Counter
- Flame icon + number
- Animated on update

### Bottom Navigation
- Fixed to bottom
- 5 icon + label items
- Active state: amber color

### Toast Notifications
- Top-right positioned
- Slide-in animation
- Auto-dismiss after 4s

### Ryna Chat Modal
- Slide up from bottom-right
- Messages with avatars
- Voice input button
- Loading spinner

---

## Responsive Breakpoints

### Desktop (>1024px)
- Max content width: 1024px
- Side-by-side layouts
- Full navigation visible

### Tablet (768px-1024px)
- Adjusted padding
- Stacked layouts
- Condensed navigation

### Mobile (<768px)
- Single column
- Hidden navigation (hamburger)
- Full-width cards
- Bottom sheet navigation

---

## Animations & Effects

### Hover States
- Scale: 1.02
- Border color transitions
- Shadow glow

### Page Transitions
- Fade in: 0.3s
- Slide up: 0.3s ease-out
- Stagger children: 50ms delay each

### Completions
- Checkbox bounce
- XP slide-in notification
- Confetti on milestone completion

---

## Desired Design Principles

1. **Dark Mode First** - Primary experience
2. **Minimal & Clean** - Ample whitespace
3. **Bold Typography** - Uppercase headings
4. **Amber Accent** - CTAs and highlights
5. **Glow Effects** - Active states and achievements
6. **Smooth Transitions** - All interactions animate
7. **Desktop-First** - Optimize for larger screens first
8. **Mobile-Ready** - Responsive but secondary

---

## Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts

---

## Deliverables Requested

1. **Redesigned Desktop Layout** for all pages
2. **Responsive Mobile Layout** that adapts gracefully
3. **Updated CSS/Tailwind** design tokens
4. **New component library** if needed

Implement the redesigned UI in the codebase.
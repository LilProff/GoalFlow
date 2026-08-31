# GoalFlow Mobile App — Full Specification

> **Version:** 1.0 · **Status:** Ready for Build  
> **Platform:** iOS 16+ · Android 10+ (API 29+)  
> **Framework:** React Native 0.74+ with Expo SDK 51+  
> **Backend:** Shared with web — same REST API, same database, same auth  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture & Shared Backend](#2-architecture--shared-backend)
3. [Visual Design System](#3-visual-design-system)
4. [Typography](#4-typography)
5. [Spacing, Layout & Motion](#5-spacing-layout--motion)
6. [Navigation Architecture](#6-navigation-architecture)
7. [Screen Inventory](#7-screen-inventory)
8. [Component Library](#8-component-library)
9. [Day Planner — Detailed Spec](#9-day-planner--detailed-spec)
10. [Notifications & Background Tasks](#10-notifications--background-tasks)
11. [Authentication & Security](#11-authentication--security)
12. [Offline Strategy](#12-offline-strategy)
13. [API Contracts](#13-api-contracts)
14. [Platform Implementation Notes](#14-platform-implementation-notes)
15. [Accessibility](#15-accessibility)
16. [Build & Release Pipeline](#16-build--release-pipeline)
17. [Handoff Checklist](#17-handoff-checklist)

---

## 1. Product Overview

GoalFlow is an **AI Execution OS** — not a to-do app. It enforces daily high-performance behavior across four execution pillars: **BUILD · SHOW · EARN · SYSTEMIZE** (fully customizable per user type).

The mobile app is a **first-class client** — not a stripped-down companion. Every feature available on web is available on mobile, optimized for thumb-first interaction, push notifications, and offline-first usage.

### Core Mobile Value Props
- **Push notifications** for block transitions, reminders, and Ryna coaching nudges
- **Glanceable widgets** (iOS/Android home screen) showing today's score, current block, and streak
- **Background sync** — planner and tasks stay current even when app is closed
- **Offline-first** — full day planning works without internet; syncs on reconnect
- **Biometric auth** — Face ID / fingerprint for instant secure access

### User Personas (same as web)
| Persona | Primary Pillars | Key Mobile Use Case |
|---------|----------------|---------------------|
| Founder / Entrepreneur | BUILD, SHOW, EARN, SYSTEMIZE | Morning briefing widget, transit block audio |
| Developer / Engineer | BUILD, SYSTEMIZE | Deep work timer, task generation |
| Designer / Creative | BUILD, SHOW | Portfolio tasks, content calendar |
| Marketer / Growth | SHOW, EARN, SYSTEMIZE | Outreach tasks, analytics glance |
| Student / Learner | BUILD, SHOW, SYSTEMIZE | Study blocks, spiritual morning |
| Freelancer | BUILD, EARN, SHOW | Client tasks, invoice reminders |

---

## 2. Architecture & Shared Backend

### Single Backend, Two Clients

```
┌─────────────────────────────────────────────────┐
│                  GoalFlow Backend                │
│  Supabase (PostgreSQL + Auth + RLS + pgvector)  │
│  Node.js / Hono API layer                       │
│  OpenAI / Anthropic for Ryna AI                 │
│  Expo Push Service for notifications            │
└──────────────┬───────────────────┬──────────────┘
               │                   │
    ┌──────────▼──────┐   ┌────────▼──────────┐
    │   Web App       │   │   Mobile App      │
    │  React + Vite   │   │  React Native     │
    │  Tailwind CSS   │   │  Expo SDK 51+     │
    │  Browser push   │   │  Expo Notifs      │
    └─────────────────┘   └───────────────────┘
```

### Data Isolation & Security
- **Row Level Security (RLS)** on all Supabase tables — every query is scoped to `auth.uid()`
- Users can only read/write their own data — enforced at database level, not just API level
- JWT tokens signed by Supabase Auth — same token works on web and mobile
- Mobile stores JWT in **Expo SecureStore** (iOS Keychain / Android Keystore) — never AsyncStorage
- Refresh token rotation — silent re-auth on expiry
- All API traffic over HTTPS/TLS 1.3
- pgvector embeddings for Ryna's memory are user-scoped — no cross-user context leakage

### Shared Data Models
All TypeScript types in `src/types/index.ts` are shared between web and mobile via a shared package or copy-sync strategy:

```typescript
// Exact same types — no divergence allowed
User, Pillar, Task, DailyData, Goal, Milestone,
ChatMessage, KPISummary, HistoryEntry, WeeklyReport,
OnboardingState, NotificationPreferences, TimeBlock
```

### API Base URL Strategy
```typescript
// shared/config.ts
const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.goalflow.ai';
```

---

## 3. Visual Design System

### Design Philosophy
GoalFlow uses a **warm terminal aesthetic** — purposeful, dense, functional. Not cold tech blue. Not generic SaaS purple. The palette is warm charcoal with acid lime as the dominant accent. Sharp rectangular corners everywhere. Monospaced typography for all data labels. The feel: command center meets execution journal.

**Core rule:** No decoration for decoration's sake. Every visual element earns its place.

### Color Tokens

```typescript
// theme/colors.ts — import everywhere, never hardcode
export const colors = {
  // Backgrounds
  bgVoid:    '#0c0b09',  // deepest — app shell, nav bars, status bar
  bgBase:    '#111008',  // primary — screen backgrounds
  bgRaised:  '#181510',  // cards, panels, list items
  bgOverlay: '#1f1c14',  // modals, bottom sheets, popovers
  bgFloat:   '#252018',  // tooltips, dropdowns

  // Borders
  borderDim:    'rgba(255,240,200,0.04)',  // subtle dividers
  borderMid:    'rgba(255,240,200,0.08)',  // default card borders
  borderBright: 'rgba(255,240,200,0.15)', // hover / focus borders

  // Text
  txPrimary:   '#f0ead8',  // headings, key data, active labels
  txSecondary: '#a89f88',  // body text, descriptions
  txMuted:     '#5a5448',  // metadata, micro labels
  txGhost:     '#2e2b24',  // placeholder, disabled

  // Accents
  acid:   '#d4f53c',  // primary CTA, active states, progress
  acid2:  '#b8e030',  // acid pressed/hover state
  ember:  '#ff6b35',  // BUILD pillar, deep work, creation
  aqua:   '#00d4b4',  // SHOW pillar, Ryna AI, distribution
  gold:   '#f5c842',  // EARN pillar, revenue, monetization
  slate:  '#7b8fa8',  // SYSTEMIZE pillar, automation, systems

  // Semantic
  success: '#00d4b4',
  warning: '#f5c842',
  error:   '#ff4444',
  info:    '#7b8fa8',
} as const;
```

### Pillar Color Map
```typescript
export const pillarColors = {
  BUILD:     { accent: '#ff6b35', bg: 'rgba(255,107,53,0.08)',  border: 'rgba(255,107,53,0.25)'  },
  SHOW:      { accent: '#00d4b4', bg: 'rgba(0,212,180,0.08)',   border: 'rgba(0,212,180,0.25)'   },
  EARN:      { accent: '#f5c842', bg: 'rgba(245,200,66,0.08)',  border: 'rgba(245,200,66,0.25)'  },
  SYSTEMIZE: { accent: '#7b8fa8', bg: 'rgba(123,143,168,0.08)', border: 'rgba(123,143,168,0.25)' },
};
```

### Block / Category Color Map (Day Planner)
```typescript
export const blockColors = {
  sleep:     '#7b8fa8',
  spiritual: '#d4f53c',
  exercise:  '#ff6b35',
  transit:   '#a78bfa',
  deepwork:  '#ff6b35',
  meals:     '#f5c842',
  admin:     '#94a3b8',
  show:      '#00d4b4',
  earn:      '#f5c842',
  buffer:    '#475569',
  personal:  '#c084fc',
};
```

### Border Radius
**GoalFlow uses 0dp border radius everywhere.** Sharp corners are a core brand differentiator. No rounded cards, no pill buttons (except toggle switches).

```typescript
export const radius = {
  none:   0,   // all interactive elements — buttons, cards, inputs, modals
  toggle: 10,  // only exception: toggle switch pill
  avatar: 0,   // square avatar
};
```

---

## 4. Typography

### Font Loading (Expo)
```typescript
// app/_layout.tsx
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
```

### Type Scale
```typescript
export const typography = {
  // Display — hero numbers, score
  display:  { fontFamily: 'SpaceGrotesk_700Bold',   fontSize: 36, lineHeight: 38 },
  // Headings
  h1:       { fontFamily: 'SpaceGrotesk_700Bold',   fontSize: 24, lineHeight: 28 },
  h2:       { fontFamily: 'SpaceGrotesk_700Bold',   fontSize: 20, lineHeight: 24 },
  h3:       { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, lineHeight: 20 },
  // Body
  body:     { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, lineHeight: 22 },
  bodyMed:  { fontFamily: 'SpaceGrotesk_500Medium',  fontSize: 14, lineHeight: 22 },
  small:    { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18 },
  // Mono — ALL data labels, metrics, codes
  monoXS:   { fontFamily: 'SpaceMono_400Regular',   fontSize: 9,  letterSpacing: 1.5 },
  monoSM:   { fontFamily: 'SpaceMono_400Regular',   fontSize: 10, letterSpacing: 1.5 },
  monoMD:   { fontFamily: 'SpaceMono_700Bold',      fontSize: 12, letterSpacing: 1 },
  monoLG:   { fontFamily: 'SpaceMono_700Bold',      fontSize: 16 },
  // Buttons
  btn:      { fontFamily: 'SpaceGrotesk_700Bold',   fontSize: 13 },
  btnMono:  { fontFamily: 'SpaceMono_700Bold',      fontSize: 10, letterSpacing: 1.5 },
};
```

> **Mobile note:** Scale all font sizes up by ~10% vs web for thumb readability at arm's length. Body = 14pt minimum.

---

## 5. Spacing, Layout & Motion

### Spacing Scale
```typescript
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
};
```

### Safe Areas
```typescript
// Always use SafeAreaView or useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Bottom tab bar: height 56 + bottom inset
// Header: height 52 + top inset
// Content: paddingBottom = tabBar height + extra 16
```

### Touch Targets
- **Minimum:** 44×44dp for all interactive elements
- **Preferred:** 48×48dp for primary actions
- Increase hit slop on small icons: `hitSlop={{ top:8, bottom:8, left:8, right:8 }}`

### Motion Principles
```typescript
// Durations
const duration = {
  micro:  100,  // toggles, checkbox, state flips
  short:  150,  // button press, tab switch
  medium: 250,  // panel slide, list item appear
  long:   400,  // screen transition, number ticker
};

// Easing
const easing = {
  standard:    Easing.bezier(0.4, 0, 0.2, 1),  // most transitions
  decelerate:  Easing.bezier(0, 0, 0.2, 1),    // entering elements
  accelerate:  Easing.bezier(0.4, 0, 1, 1),    // exiting elements
  spring:      { damping: 40, stiffness: 500 }, // active indicators
};

// Screen transitions
// Stack push: slide left (new) / slide right (back)
// Modal/Sheet: slide up
// Tab switch: fade (no slide — avoids motion sickness)

// List items: stagger 40ms per item, fade + translateY(8)
// Reduce Motion: check AccessibilityInfo.isReduceMotionEnabled()
```

---

## 6. Navigation Architecture

### Structure (Expo Router)
```
app/
├── _layout.tsx              # Root layout — fonts, safe area, store
├── index.tsx                # Landing / auth gate
├── onboarding/
│   └── _layout.tsx          # Onboarding stack
│   └── [step].tsx           # Steps 1–5
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

### Bottom Tab Bar Spec
```typescript
// 5 tabs — no numbers, icon + label
const TABS = [
  { name: 'today',     icon: 'layout-dashboard', label: 'TODAY'     },
  { name: 'planner',   icon: 'clock',            label: 'PLANNER'   },
  { name: 'tasks',     icon: 'check-square',     label: 'TASKS'     },
  { name: 'goals',     icon: 'target',           label: 'GOALS'     },
  { name: 'analytics', icon: 'bar-chart-3',      label: 'ANALYTICS' },
];
// Active: acid lime icon + acid lime label
// Inactive: txMuted icon, no label
// Background: bgVoid (#0c0b09)
// Top border: 1px borderMid
// Height: 56 + bottom safe area
// Font: SpaceMono_700Bold, 8pt, letterSpacing 1.5
```

### Modal / Sheet Patterns
| Surface | Type | Height | Trigger |
|---------|------|--------|---------|
| Ryna Chat | Full-screen modal | 100% | FAB or header button |
| Add Task | Bottom sheet | 65% | FAB / header + |
| Block Detail | Bottom sheet | 55% | Tap block in timeline |
| AI Reshuffle | Center modal | auto | Reshuffle button |
| Reflection | Bottom sheet | 70% | Dashboard card |
| Goal Detail | Stack push | full | Tap goal card |
| Notification detail | Top banner | auto | Push notification |
| Onboarding | Full-screen stack | 100% | First login |

### Header Pattern
```typescript
// All screens: custom header (no default RN header)
// Height: 52dp + top safe area
// Background: bgVoid
// Bottom border: 1px borderDim
// Left: screen title (SpaceGrotesk Bold 18pt)
// Right: contextual action buttons
// No back button text — chevron icon only
```

---

## 7. Screen Inventory

### 7.1 Landing / Auth
- Full-screen dark background with subtle dot-grid overlay
- Centered GoalFlow wordmark + triangle logo mark
- App Store / Play Store download badges (prominent)
- Sign In / Create Account toggle
- Email + password fields (sharp corners, acid focus border)
- Acid lime primary CTA button
- "Free during beta" micro-copy
- Biometric auth prompt on return visits

### 7.2 Onboarding (5 Steps)
- Progress bar at top: 5 segments, filled = acid, unfilled = borderMid
- Step 1 — Identity: name, email, timezone picker, occupation chips, weekly hours
- Step 2 — Pillars: tap-to-select cards with pillar symbol, label, description. Add custom pillar.
- Step 3 — Goals: one text input per selected pillar. "What does winning look like in 90 days?"
- Step 4 — Schedule: time pickers for wake/sleep, deep work windows (add/remove)
- Step 5 — Coach Style: radio list of 5 styles with symbol, name, tagline
- Continue / Back buttons. Final step: "Launch GoalFlow" → generates first-week plan → navigate to Today

### 7.3 Today Dashboard
Scrollable screen. Sections (top to bottom):
1. **Header:** Greeting + date + streak badge
2. **KPI Strip:** Score gauge (semicircle), streak count, completion %
3. **Pillar Grid:** 2×2 cards — symbol, label, tasks done/total, segmented bar
4. **Task List:** Swipe-right to complete (green flash), swipe-left to delete (red flash). Tap to expand detail.
5. **Build Hours:** Slider with live hour display
6. **Daily Reflection:** Collapsed card → tap to expand 3-field form
7. **Ryna Insight:** Acid-bordered card with today's AI coaching message

### 7.4 Day Planner — 24h Timeline
Vertical scrollable timeline. Sections:
1. **Header:** Current block indicator (pulsing dot + label), Next block chip, Reshuffle FAB
2. **Timeline:** 24h vertical scroll. Hour markers. Color-coded blocks. NOW line (acid lime, auto-scroll).
3. **Block tap → Bottom sheet:** Label, time range, duration, priority, flexible flag. Mark done / Skip buttons.
4. **Right drawer (tablet) / Bottom sheet (phone):** 24h allocation bars, Life KPIs, Accountability score, Ryna advice
5. **Notification banner:** Slides down from top on block transitions

See [Section 9](#9-day-planner--detailed-spec) for full planner spec.

### 7.5 Tasks
- Pillar filter chips (horizontal scroll)
- Status filter: ALL / PENDING / DONE / SKIPPED
- Task cards: swipe-right complete, swipe-left delete, tap for detail
- FAB: Add Task (bottom sheet)
- Header: AI Generate button (spinner while loading)
- Empty state: "Generate tasks with AI" prompt

### 7.6 Goals
- Pillar filter chips
- Goal cards: pillar symbol, title, progress (segmented bar), days remaining
- Tap card → stack push to Goal Detail screen
- Goal Detail: progress slider, milestone list (tap to complete), weekly plan, edit button
- Embedded AI Goal Planner chat at bottom of detail screen

### 7.7 Analytics
- Tab switcher: OVERVIEW / PERFORMANCE / PILLARS
- Overview: Score trend line chart (14 days), Build hours bar chart, Pillar pie chart
- Performance: Weekly report card, highlights/improvements, Ryna weekly insight
- Pillars: Per-pillar % cards with segmented bars, combined trend chart
- All charts: Victory Native XL (Skia-based, 60fps)

### 7.8 Settings
- Grouped list sections (iOS-style grouped, but styled to match GoalFlow aesthetic)
- Profile: avatar (square), name, email, occupation, timezone, coach style
- Notifications: push toggle, individual toggles, time pickers
- Appearance: dark mode toggle (only mode in v1), accent preview
- Security: change password, active sessions, sign out, delete account
- About: version, terms, privacy policy

### 7.9 Ryna Chat
- Full-screen modal, slides up
- Header: Ryna wordmark + aqua pulse dot + "AI EXECUTION COACH" label
- Message list: user = acid tint + acid border, AI = raised bg + 2px aqua left border
- Mono "RYNA" label above each AI message
- Quick action chips: horizontal scroll row above input
- Input: text field + send button. Keyboard-aware (KeyboardAvoidingView)
- Typing indicator: 3 bouncing dots, aqua
- Context injection: current goals, today's tasks, streak, score passed in system prompt

### 7.10 Home Screen Widgets (Phase 2)
- **Small (2×2):** Today's score + streak
- **Medium (4×2):** Current block + next block + completion %
- **Large (4×4):** Full today summary — score, pillars, next 3 tasks
- Implemented via `expo-widgets` or native widget extensions

---

## 8. Component Library

All components live in `components/` — built once, used across all screens.

### 8.1 PillarTag
```typescript
interface PillarTagProps {
  pillarId: string;   // 'BUILD' | 'SHOW' | 'EARN' | 'SYSTEMIZE' | custom
  size: 'xs' | 'sm' | 'md';
}
// Mono text, pillar color text + bg + border. 0dp radius.
// xs: 9pt, 2px horizontal pad; sm: 10pt, 6px; md: 12pt, 8px
```

### 8.2 SegBar (Segmented Progress Bar)
```typescript
interface SegBarProps {
  value: number;      // 0–100
  color: string;      // CSS/RN color string
  segments?: number;  // default 20
  height?: number;    // default 4
}
// N thin rectangles with 1dp gaps. Filled segments use color at
// increasing opacity (0.5 → 1.0) for depth. Sharp corners.
```

### 8.3 ScoreGauge
```typescript
interface ScoreGaugeProps {
  score: number;   // 0–10
  size?: number;   // default 80
}
// Semicircle SVG arc. Color: ≥8=aqua, ≥6=acid, ≥4=gold, <4=ember.
// Animated stroke-dashoffset on mount. Mono score label below arc.
```

### 8.4 BlockPill (Timeline)
```typescript
interface BlockPillProps {
  block: TimeBlock;
  isNow: boolean;
  pxPerMinute: number;  // layout constant
  onPress: () => void;
}
// Absolute positioned in ScrollView. Height = duration * pxPerMinute.
// Left border = category color (3dp). Glow shadow when isNow.
// Pulse dot when isNow. Truncate label if height < 32dp.
```

### 8.5 NumberTicker
```typescript
interface NumberTickerProps {
  value: number;
  decimals?: number;   // default 0
  duration?: number;   // ms, default 600
}
// Animated counter. Uses Reanimated 3 withTiming + Easing.out(Easing.cubic).
// Re-animates on value change. Used for score, streak, XP, %.
```

### 8.6 Btn
```typescript
type BtnVariant = 'acid' | 'ghost' | 'outline' | 'danger' | 'dim';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';
interface BtnProps {
  variant?: BtnVariant;  // default 'outline'
  sz?: BtnSize;          // default 'md'
  loading?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  children: ReactNode;
}
// acid: acid bg, void text, no border
// ghost: transparent bg, txSecondary text, no border
// outline: transparent bg, txSecondary text, borderMid border
// danger: transparent bg, error text, error border at 30% opacity
// dim: bgOverlay bg, txSecondary text, borderMid border
// All: 0dp radius, SpaceGrotesk_700Bold, 150ms press animation (scale 0.97)
```

### 8.7 Toggle
```typescript
interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  color?: string;  // default acid
}
// 36×20dp pill. ON: color bg, dark thumb. OFF: borderMid bg, muted thumb.
// 200ms withTiming animation. 10dp border radius (only rounded element).
```

### 8.8 SwipeableTaskCard
```typescript
// react-native-gesture-handler Swipeable
// Right action: green flash → mark complete (with haptic: Haptics.notificationAsync(SUCCESS))
// Left action: red flash → delete (with haptic: Haptics.notificationAsync(WARNING))
// Snap back if released before threshold (40% of card width)
// Tap: expand detail bottom sheet
```

### 8.9 NotifBanner
```typescript
type NotifType = 'start' | 'end' | 'warning' | 'reshuffle' | 'info';
interface NotifBannerProps {
  notif: Notification;
  onDismiss: () => void;
}
// Slides down from top (translateY: -80 → 0, spring animation)
// Left border = type color. Type icon on left.
// Auto-dismiss after 4000ms. Manual dismiss on tap.
// Stacks if multiple (queue, show one at a time)
```

### 8.10 RynaMessage
```typescript
// User: acid tint bg (#d4f53c12), acid border, acid text
// AI: bgRaised, borderDim, 2dp left border aqua, txSecondary text
// Mono 'RYNA' label (8pt, aqua, letterSpacing 1.5) above AI messages
// Quick action chips: horizontal FlatList below message if present
// Max width: 88% of screen width
// Padding: 12px horizontal, 10px vertical
```

### 8.11 PillarCard (Today Dashboard)
```typescript
interface PillarCardProps {
  pillar: Pillar;
  tasks: Task[];
  onPress: () => void;
}
// 2×2 grid layout on Today screen (each card ~50% width - gap)
// Top: pillar symbol (24pt, pillar color) + completion % (mono, right)
// Middle: pillar label (SpaceGrotesk_700Bold, 13pt)
// Bottom: tasks done/total (mono 9pt) + SegBar
// Active: pillar bg + pillar border. Tap: filter tasks to this pillar.
```

### 8.12 TimeAllocationBar
```typescript
interface TimeAllocationBarProps {
  category: BlockCategory;
  minutes: number;
  totalMinutes: number;  // 1440
}
// Horizontal bar: label left, duration right, bar fills proportionally
// Color = category color. Height 6dp. 0dp radius.
// Used in Planner right panel / bottom sheet summary.
```

---

## 9. Day Planner — Detailed Spec

### Timeline Layout
```
Total height = 1440 minutes × pxPerMinute
pxPerMinute = 0.5 (phone) / 0.7 (tablet)
→ Phone: 720px total height (scrollable)
→ Tablet: 1008px total height

Hour markers: every 60 minutes
Major markers (00:00, 06:00, 12:00, 18:00): borderMid
Minor markers: borderDim

Now line: acid lime, 1dp height, pulse dot right end
Auto-scroll to now - 2h on mount
Update position every 60 seconds
```

### Block Categories, Colors & Rules

| Category | Color | Priority | Flexible? | Min Duration | AI Can Compress? |
|----------|-------|----------|-----------|--------------|------------------|
| Sleep | `#7b8fa8` | FIXED | No | 360min (6h) | Only in emergency — warn user |
| Spiritual (Prayer) | `#d4f53c` | HIGH | No | 20min | Never auto-skip — always warn |
| Spiritual (Bible) | `#d4f53c` | HIGH | Semi | 15min | Can shift window, not remove |
| Exercise | `#ff6b35` | HIGH | Yes | 20min | Can shift window, cannot remove |
| Transit | `#a78bfa` | FIXED | No | Actual time | Fixed — adjust surrounding blocks |
| Deep Work | `#ff6b35` | HIGH | Yes | 45min | Can shift time, protect duration |
| Meals | `#f5c842` | MEDIUM | Yes | 15min | Can compress to 15min |
| Show | `#00d4b4` | HIGH | Yes | 15min | Can shift, not remove |
| Earn | `#f5c842` | HIGH | Yes | 15min | Can shift, not remove |
| Admin | `#94a3b8` | MEDIUM | Yes | 15min | Can compress or remove |
| Buffer | `#475569` | LOW | Yes | 10min | First to compress |
| Personal | `#c084fc` | MEDIUM | Semi | 20min | Can compress, protect evenings |

### Default Ideal Day Template

```
00:00 – 06:00  Sleep (6h)                 [FIXED]
06:00 – 06:30  Morning Prayer (30m)        [HIGH · NON-FLEXIBLE]
06:30 – 06:50  Bible Reading (20m)         [HIGH · SEMI-FLEXIBLE]
06:50 – 07:35  Exercise / Gym (45m)        [HIGH · FLEXIBLE WINDOW]
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

### AI Reshuffle Logic

```typescript
// POST /api/v1/planner/reshuffle
// Body: { date, blocks, reason, currentTime }
// Response: { reshuffledBlocks, changes: Change[], explanation }

interface Change {
  blockId: string;
  field: 'startMinute' | 'durationMinutes' | 'skipped';
  oldValue: number | boolean;
  newValue: number | boolean;
  reason: string;
}

// Reshuffle rules (priority order):
// 1. Never remove Sleep below 6h without explicit user consent
// 2. Never auto-skip Spiritual blocks — flag and warn
// 3. Protect Deep Work duration — shift time, don't shorten
// 4. Compress Buffer blocks first (min 10min)
// 5. Compress Meals second (min 15min)
// 6. Shift Exercise window if needed, never remove
// 7. Transit is immovable — adjust all surrounding blocks
// 8. Personal blocks can be compressed in emergencies
// 9. Always show explanation of every change to user
// 10. User can reject individual changes or full reshuffle
```

### Accountability Scoring
```typescript
// Day score calculation
const calcDayScore = (blocks: TimeBlock[]): number => {
  const weights = {
    fixed:  1.0,  // completing fixed blocks = full weight
    high:   0.9,
    medium: 0.6,
    low:    0.3,
  };
  const total = blocks.reduce((s, b) => s + weights[b.priority], 0);
  const done  = blocks.filter(b => b.completed).reduce((s, b) => s + weights[b.priority], 0);
  return Math.round((done / total) * 100);
};

// Life KPI thresholds
const KPI_TARGETS = {
  sleep:    { min: 360, target: 420, unit: 'min' },  // 6h min, 7h target
  spiritual:{ min: 30,  target: 50,  unit: 'min' },
  exercise: { min: 30,  target: 45,  unit: 'min' },
  deepWork: { min: 120, target: 240, unit: 'min' },  // 2h min, 4h target
};
```

---

## 10. Notifications & Background Tasks

### Setup
```typescript
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

// Register push token on first login
const registerPushToken = async (userId: string) => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await api.post('/api/v1/notifications/register', { token, userId });
};
```

### Notification Categories & Triggers

| Category | Trigger | Content | Sound |
|----------|---------|---------|-------|
| `BLOCK_START` | 5min before block | "[Block] starts in 5 minutes — prepare" | Default |
| `BLOCK_END` | 5min before end | "[Block] ending soon — wrap up" | Soft |
| `BLOCK_OVERRUN` | Block overruns 10min | "You're 10min over on [Block]" | Alert |
| `SLEEP_RISK` | Projected sleep < 6h | "Sleep at risk — you need to wind down by [time]" | Alert |
| `SPIRITUAL_MISSED` | Prayer block skipped | "Morning prayer wasn't logged — still time" | Soft |
| `EXERCISE_MISSED` | No exercise by 2pm | "No exercise logged — 30min walk counts" | Default |
| `DEEP_WORK_LOW` | < 2h deep work by 3pm | "Only [Xh] deep work today — protect the next block" | Default |
| `REFLECTION_PROMPT` | User's set time daily | "Time to reflect — how did today go?" | Soft |
| `STREAK_RISK` | Score < 4 by 8pm | "Streak at risk — complete 2 more tasks to save it" | Alert |
| `RESHUFFLE_OFFER` | 2+ blocks behind | "Your day is off track — want Ryna to reshuffle?" | Default |
| `MORNING_BRIEFING` | User's wake time | "Day [N] of sprint — [X] tasks queued. Let's go." | Default |
| `WEEKLY_REPORT` | Sunday evening | "Your week in review — [score] avg. Open GoalFlow." | Soft |

### Local Notification Scheduling
```typescript
// Schedule all block notifications for the day at midnight
const scheduleDayNotifications = async (blocks: TimeBlock[]) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const today = startOfDay(new Date());

  for (const block of blocks) {
    // Start notification (5min before)
    const startTime = addMinutes(today, block.startMinute - 5);
    if (startTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GoalFlow',
          body: `${block.label} starts in 5 minutes`,
          categoryIdentifier: 'BLOCK_START',
          data: { blockId: block.id },
        },
        trigger: { date: startTime },
      });
    }
  }
};
```

### Do Not Disturb Respect
- During sleep blocks: suppress all non-emergency notifications
- Emergency = SLEEP_RISK (override DND) and STREAK_RISK (override DND)
- All others: respect system DND settings

---

## 11. Authentication & Security

### Auth Flow
```
App launch
  → Check SecureStore for JWT
  → If exists: validate with /auth/verify
    → Valid: navigate to app
    → Expired: silent refresh with refresh token
    → Invalid: navigate to auth screen
  → If none: navigate to auth screen

Sign up:
  POST /auth/signup { name, email, password }
  → Returns { accessToken, refreshToken, user }
  → Store both in SecureStore
  → Navigate to onboarding

Sign in:
  POST /auth/login { email, password }
  → Returns { accessToken, refreshToken, user }
  → Store both in SecureStore
  → Navigate to dashboard (or onboarding if incomplete)

Biometric (Phase 2):
  → Store credentials encrypted with biometric key
  → expo-local-authentication for Face ID / fingerprint
  → Prompt on app foreground after 5min background
```

### Token Storage
```typescript
import * as SecureStore from 'expo-secure-store';

// NEVER use AsyncStorage for auth tokens
const AUTH_KEY = 'goalflow_access_token';
const REFRESH_KEY = 'goalflow_refresh_token';

export const storeTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync(AUTH_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
};

export const getAccessToken = () => SecureStore.getItemAsync(AUTH_KEY);
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(AUTH_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
};
```

### API Request Interceptor
```typescript
// Every API request automatically attaches JWT
// On 401: attempt silent refresh, retry once, then sign out
axios.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    const refreshed = await silentRefresh();
    if (refreshed) return axios.request(error.config);
    await clearTokens();
    router.replace('/');
  }
  return Promise.reject(error);
});
```

### Data Security
- All user data scoped by `user_id` via Supabase RLS — no server-side filtering needed
- Sensitive fields (passwords) never stored locally
- Push tokens stored server-side, scoped to user — never shared
- Ryna AI context: only user's own data sent to LLM — no cross-user data in prompts
- App transport security: HTTPS only, certificate pinning in production

---

## 12. Offline Strategy

### What Works Offline
| Feature | Offline Behavior |
|---------|------------------|
| Today Dashboard | Show cached data, queue task toggles |
| Day Planner | Full functionality from local cache |
| Task completion | Optimistic update, sync on reconnect |
| Reflection | Save locally, sync on reconnect |
| Build hours | Save locally, sync on reconnect |
| Goals view | Show cached goals |
| Analytics | Show cached charts |
| Ryna Chat | Show cached history, queue new messages |
| AI Generate Tasks | Requires internet — show offline state |
| AI Reshuffle | Requires internet — show offline state |

### Implementation
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache keys
const CACHE = {
  daily: (date: string) => `daily_${date}`,
  planner: (date: string) => `planner_${date}`,
  goals: 'goals',
  kpi: 'kpi',
};

// On every successful API response: cache the result
// On API failure + offline: serve from cache
// On reconnect: flush mutation queue in order

// Mutation queue
interface QueuedMutation {
  id: string;
  method: 'PATCH' | 'PUT' | 'POST';
  url: string;
  body: unknown;
  timestamp: number;
}
```

---

## 13. API Contracts

All endpoints are shared with the web app. Base URL: `https://api.goalflow.ai`

### Auth
```
POST /auth/signup          { name, email, password } → { user, accessToken, refreshToken }
POST /auth/login           { email, password }        → { user, accessToken, refreshToken }
POST /auth/refresh         { refreshToken }           → { accessToken, refreshToken }
GET  /auth/verify          (header: Bearer token)     → { user } | 401
POST /auth/logout          (header: Bearer token)     → 200
```

### Daily & Tasks
```
GET  /api/v1/daily?date=YYYY-MM-DD     → DailyData
PUT  /api/v1/daily                     { DailyData }     → DailyData
POST /api/v1/tasks/generate            { date, pillars } → Task[]
PATCH /api/v1/tasks/:id               { status }        → Task
DELETE /api/v1/tasks/:id              →  204
```

### Planner
```
GET  /api/v1/planner?date=YYYY-MM-DD  → TimeBlock[]
PUT  /api/v1/planner                  { date, blocks }  → TimeBlock[]
POST /api/v1/planner/reshuffle        { date, blocks, reason, currentTime } → { blocks, changes, explanation }
```

### Goals
```
GET  /api/v1/goals                    → Goal[]
POST /api/v1/goals                    { Goal }          → Goal
PATCH /api/v1/goals/:id              { Partial<Goal> }  → Goal
DELETE /api/v1/goals/:id             → 204
```

### Analytics
```
GET /api/v1/analytics/summary         → KPISummary
GET /api/v1/analytics/history?days=14 → HistoryEntry[]
GET /api/v1/analytics/weekly-report   → WeeklyReport
```

### Ryna AI
```
POST /api/v1/ryna/chat               { message, context } → { reply, quickActions }
GET  /api/v1/ryna/history            → ChatMessage[]
GET  /api/v1/ryna/weekly             → WeeklyReport
```

### Notifications
```
GET  /api/v1/notifications/prefs      → NotificationPreferences
PUT  /api/v1/notifications/prefs      { NotificationPreferences } → NotificationPreferences
POST /api/v1/notifications/register  { token, platform } → 200
DELETE /api/v1/notifications/register { token }          → 200
```

### Onboarding
```
POST /onboarding/save-step           { step, data }    → 200
POST /onboarding/complete            { OnboardingState } → { user, firstWeekPlan }
```

---

## 14. Platform Implementation Notes

### Dependencies
```json
{
  "expo": "~51.0.0",
  "expo-router": "~3.5.0",
  "react-native": "0.74.x",
  "react-native-reanimated": "~3.10.0",
  "react-native-gesture-handler": "~2.16.0",
  "react-native-safe-area-context": "4.10.x",
  "react-native-screens": "~3.31.0",
  "expo-notifications": "~0.28.0",
  "expo-task-manager": "~11.8.0",
  "expo-secure-store": "~13.0.0",
  "expo-local-authentication": "~14.0.0",
  "expo-font": "~12.0.0",
  "expo-haptics": "~13.0.0",
  "@expo-google-fonts/space-grotesk": "latest",
  "@expo-google-fonts/space-mono": "latest",
  "victory-native": "^41.0.0",
  "@shopify/react-native-skia": "^1.3.0",
  "zustand": "^4.5.0",
  "@tanstack/react-query": "^5.0.0",
  "axios": "^1.7.0",
  "date-fns": "^3.6.0",
  "@react-native-async-storage/async-storage": "^2.0.0",
  "@react-native-community/netinfo": "^11.3.0"
}
```

### Haptic Feedback
```typescript
import * as Haptics from 'expo-haptics';

// Task complete:    Haptics.notificationAsync(NotificationFeedbackType.Success)
// Task delete:      Haptics.notificationAsync(NotificationFeedbackType.Warning)
// Block skip:       Haptics.impactAsync(ImpactFeedbackStyle.Medium)
// Reshuffle start:  Haptics.impactAsync(ImpactFeedbackStyle.Heavy)
// Button press:     Haptics.impactAsync(ImpactFeedbackStyle.Light)
// Error:            Haptics.notificationAsync(NotificationFeedbackType.Error)
```

### Charts (Victory Native XL)
```typescript
// Same data shape as web Recharts — easy to port
// LineChart, BarChart, PieChart equivalents available
// Runs on Skia canvas — 60fps, no bridge overhead
// Dark background: bgRaised (#181510)
// Grid lines: borderDim (rgba(255,240,200,0.04))
// Tick labels: SpaceMono_400Regular, 9pt, txGhost
// Tooltip: custom component, bgOverlay, borderMid
```

### Status Bar
```typescript
// Always dark content (light text) — matches dark theme
<StatusBar style="light" backgroundColor={colors.bgVoid} />
```

---

## 15. Accessibility

- All interactive elements: minimum 44×44dp touch target
- `accessibilityLabel` on all icon buttons
- `accessibilityRole` on custom interactive components
- `accessibilityState` for toggles, checkboxes, selected states
- VoiceOver (iOS) and TalkBack (Android) fully supported
- Dynamic Type: use `allowFontScaling={false}` on mono labels only; all other text scales
- Sufficient contrast: all text/background combos meet WCAG AA (4.5:1 minimum)
- Reduce Motion: wrap all animations in `if (!reduceMotion)` check
- Color: never use color as the only differentiator — always pair with icon or label

---

## 16. Build & Release Pipeline

```yaml
# EAS Build configuration
build:
  development:
    developmentClient: true
    distribution: internal
  preview:
    distribution: internal
    ios:
      simulator: true
  production:
    autoIncrement: true
    ios:
      buildConfiguration: Release
    android:
      buildType: apk  # or app-bundle for Play Store
```

### Release Checklist
- [ ] All environment variables set in EAS Secrets
- [ ] Push notification certificates configured (iOS APNs, Android FCM)
- [ ] App icons: 1024×1024 (iOS), 512×512 (Android) — square, no alpha
- [ ] Splash screen: bgVoid background, centered triangle logo
- [ ] Privacy policy URL in app store listing
- [ ] App Store: category = Productivity, age rating = 4+
- [ ] Play Store: category = Productivity, content rating = Everyone
- [ ] TestFlight / Internal Testing before production release
- [ ] Sentry error tracking configured
- [ ] Analytics (Expo Analytics or PostHog) configured

---

## 17. Handoff Checklist

### Before Build Starts
- [ ] Export `colors.ts` — all color tokens as constants
- [ ] Export `typography.ts` — all type styles
- [ ] Export `spacing.ts` — spacing scale
- [ ] Load fonts via `expo-font` in root layout
- [ ] Port `src/types/index.ts` — identical types, no divergence
- [ ] Port `src/lib/store.ts` — identical Zustand store shape
- [ ] Configure Axios with base URL + interceptors
- [ ] Set up Expo Router file structure
- [ ] Configure EAS Build (dev / preview / production)
- [ ] Set up SecureStore auth flow
- [ ] Register push notification handler
- [ ] Build shared component library (SegBar, Btn, Toggle, etc.) first
- [ ] Set up React Query with offline persistence
- [ ] Configure Victory Native XL + Skia
- [ ] Set up react-native-gesture-handler
- [ ] Test on physical device before simulator — especially timeline scroll

### Quality Gates
- [ ] All screens render correctly on iPhone SE (small) and iPhone 15 Pro Max (large)
- [ ] All screens render correctly on Android (Pixel 7 reference device)
- [ ] Offline mode: all cached screens work without internet
- [ ] Push notifications: all 12 trigger types fire correctly
- [ ] Auth: sign up → onboarding → dashboard flow works end-to-end
- [ ] Biometric: Face ID / fingerprint prompt appears correctly
- [ ] Planner: 24h timeline scrolls smoothly at 60fps
- [ ] Ryna chat: keyboard avoidance works on both platforms
- [ ] Swipe gestures: task complete/delete work correctly
- [ ] Reduce Motion: animations disabled when system setting is on

---

*GoalFlow Mobile Spec v1.0 · Confidential · © 2025 GoalFlow*

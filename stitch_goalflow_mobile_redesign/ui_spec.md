# GoalFlow — UI & Component Specification

**Purpose:** this is a functional brief for a visual redesign. It documents every screen, every interactive element, every piece of data shown, and the reusable component patterns — with **no colors, fonts, spacing values, or other brand/visual-design decisions**. Treat everything below as "what exists and what it does"; the redesigner owns "what it looks like." Preserve all listed functionality — every button, toggle, filter, and state described here needs a home in the new design.

Scope: the web app (responsive down to a ~375px-wide phone; a full native app doesn't exist yet — the phone experience today is this same responsive web app used as an installable PWA, with a bottom tab bar replacing the sidebar).

---

## 1. Reusable component patterns

These are the structural UI patterns that repeat across screens. Two are genuinely reused everywhere; the rest are one-off patterns worth standardizing during redesign even though today's code repeats them inline per screen.

- **Segmented progress bar** — a horizontal bar made of many small discrete blocks rather than one continuous fill; the number of "filled" blocks equals the percentage value. Used for goal progress, pillar completion, and score visualizations throughout the app. Takes a value (0–100), a target segment count, and a thickness.
- **Animated number readout** — any numeric stat (score, streak, percentage, XP, hour counts) counts up/down smoothly from its previous value to its new value over a fraction of a second whenever it changes, rather than snapping instantly. Supports a fixed decimal-place count.
- **Semi-circular gauge** — a half-donut arc used specifically for "today's score," filling proportionally to the 0–10 score with an animated numeric readout centered underneath the arc.
- **Pillar tag** — a small labeled chip identifying which of the four execution pillars (Build / Show / Earn / Systemize, or a user's custom pillars) an item belongs to. Appears on tasks, goals, leaderboard entries.
- **Status/filter chip row** — a horizontal row of toggle buttons (e.g. "All / Build / Show / Earn / Systemize", "All / Pending / Done / Skipped") where exactly one is active at a time and clicking re-filters a list below.
- **Inline expandable editor** — clicking an item (a task row, a planner block) expands an editor directly in place in the list, rather than opening a separate modal — used for tasks and planner blocks.
- **Modal dialog** — centered card over a dimmed backdrop, used for creation flows (new task, new goal) and confirmations (delete account). Clicking the backdrop dismisses non-destructive modals; destructive ones require an explicit button.
- **Typed-confirmation modal** — for the single most destructive action (account deletion): the confirm button stays disabled until the user types a specific literal word into a field, in addition to the normal modal pattern.
- **Toggle switch** — standard on/off pill switch used throughout Settings and Onboarding for boolean preferences.
- **Coach-style picker** — a repeated list pattern (in Onboarding and Settings): a vertical list of persona options, each showing a symbol/icon, a name, a short description, and a tagline, with single-select behavior. In the chat assistant panel this same option set appears instead as a horizontal row of compact chips.
- **Empty state** — icon + bold one-line message + a short explanatory sentence + a primary button that resolves the emptiness (e.g. "No goals yet" → "+ New Goal"). Used on Goals and Tasks.
- **Loading conventions**:
  - Full-screen loader: a centered spinner, shown while checking for a stored login session on app boot and while a lazily-loaded screen's code is downloading.
  - Inline/button loading: an async button swaps its label for a small spinner plus a present-progressive verb ("Saving…", "Creating…", "Deleting…") and disables itself for the duration.
- **Error conventions**: validation and server errors render as inline red text directly beneath the relevant field or button — there is no global toast/notification-stack pattern for errors.

---

## 2. Global app shell & navigation

### 2.1 Desktop sidebar (wide viewports)
A persistent left-hand vertical rail, collapsible between an icon-only narrow state and a labeled wide state (toggle button on its edge).
- Top: wordmark/logo + a small "BETA" tag (hidden when collapsed).
- Primary navigation list, one row per top-level screen, in this order: **Today** (Dashboard), **Planner**, **Tasks**, **Goals**, **Analytics**, **Leaderboard**, **Settings**. Each row = icon + label; the active route is visually highlighted with a sliding indicator.
- A divider, then a standalone **Ryna** row that opens the floating AI chat panel (does not navigate).
- Footer: current level label + XP count + a thin XP progress bar; below that, a user-identity row (avatar-initial box, name, email — truncates) with a sign-out icon button.

### 2.2 Mobile bottom tab bar (narrow viewports)
Replaces the sidebar below the tablet breakpoint.
- Fixed bar pinned to the bottom of the screen, 5 buttons: **Today, Planner, Tasks, Goals**, and a 5th **More** button.
- Respects the device's bottom safe-area inset (so it clears the home-indicator gesture bar on notch phones).
- **More** opens a bottom sheet (slides up over a dimmed backdrop):
  - Header: user identity (avatar-initial box + name) + a close (×) button.
  - A 3-item grid: Analytics, Leaderboard, Settings.
  - A full-width "Ask Ryna" button (opens the chat panel).
  - A full-width "Sign Out" button.

### 2.3 Offline banner
A thin, full-width bar that appears at the very top of the whole app (above every screen, including signed-out ones) whenever the browser reports no network connection. Persistent for as long as the condition is true — not a dismissible toast. Shows an icon plus the message "Offline — changes won't save until you're back online." Disappears automatically once connectivity returns.

### 2.4 Ryna — global AI assistant panel
A floating chat panel that can be opened from many places (sidebar item, mobile "More" sheet, "Ask Ryna" buttons scattered across screens). One instance exists app-wide.
- **Desktop:** a fixed panel anchored to the bottom-right corner.
- **Mobile:** expands to a near-fullscreen sheet that still clears the bottom tab bar and the top safe area.
- **Header:** Ryna label + a small pulsing "live" dot + a tag showing the currently active coach style, a minimize/maximize icon button, and a close (×) button. Minimizing collapses the panel down to just this header bar.
- **Body (when expanded):**
  - An optional transient success banner ("✓ [result]") after an action executes, auto-dismissing after a few seconds.
  - Scrolling message history: user messages align right, assistant messages align left with a "RYNA" label. A 3-dot "typing" indicator appears while a response is pending.
  - Assistant messages can attach either of two extra elements:
    - An **action card** — a proposed automated action with a one-line preview of what it would do and an "Execute Action" button (which becomes a disabled "✓ Executed" state once run).
    - A row of **quick-reply chips** — tapping one sends that chip's preset text as the next user message.
  - A horizontal scrolling row of preset **quick-action shortcuts** (always visible, independent of the current conversation).
  - A horizontal scrolling row of **coach-style switch chips** — lets the user change Ryna's active persona at any time; the current one is visually marked.
  - Text input + send button (Enter to send), with a caption hinting at what Ryna can do ("Ryna can add tasks, reshuffle your day, draft emails, and more").

---

## 3. Screen: Landing (signed-out home + auth)

Single screen with an internal mode switch between a marketing "home" view and an "auth" view (sign-in or sign-up form); the current mode is reflected in the URL so it's linkable and browser-back returns to the marketing view rather than leaving the site. Already-signed-in visitors are redirected straight past this screen.

**Persistent elements (both modes):**
- A looping horizontal ticker strip at the very top scrolling short taglines (product name, feature keywords) continuously.
- A top nav bar: logo + wordmark on the left; "Sign In" and "Get Started" buttons on the right (both switch the mode).

### 3.1 Home / marketing mode
Top to bottom, a single scrolling page of sections:
1. **Hero** — a small "system online" status line with a pulsing indicator dot; a large two-line headline; a supporting paragraph describing the product; a call-to-action row ("Start free on web" primary button + "Sign In" button); a row of App Store / Google Play badges (both inert — "coming soon" placeholders, not live links); a fine-print line underneath.
2. **Stats bar** — a 4-column strip of short stat callouts (a value and a label each), separated by dividers.
3. **"Execution framework" section** — a section label, then a 4-card grid, one per pillar, each showing a symbol/icon, the pillar name, and a one-line sub-description.
4. **Features list** — 6 full-width numbered rows (numbered 01–06), each with a title and a description paragraph; rows highlight on hover.
5. **"One account, every device" section** — a 3-card grid (Web / iOS / Android), each with an icon, a status tag ("Live now" vs. "Coming soon"), the platform name, and a short description; below that, a callout box (icon + bold lead-in + explanatory paragraph) about one account syncing across devices; then another App Store / Google Play badge row.
6. **Security & privacy section** — a 2×2 grid of feature callouts (icon + title + description), covering: per-account data isolation, verified session tokens / password hashing, what happens to data sent to the AI provider, and encryption in transit/at rest.
7. **"How a day runs" section** — 3 numbered step cards: Morning brief, Execute in blocks, Evening reflection — each with a short explanatory paragraph.
8. **Final call-to-action banner** — an eyebrow line, a headline, a short paragraph, the same CTA button + store badges, and a fine-print line.
9. **Footer** — logo mark, a row of legal links (Privacy Policy / Terms of Service / Security — currently inert placeholders), and a copyright line.

### 3.2 Auth mode (sign in / sign up)
A centered card:
- Heading that differs by mode ("Welcome back." for sign-in, "Start executing." for sign-up) + a one-line subheading.
- The auth form itself:
  - **Sign-up only:** a Name field.
  - Email field (both modes).
  - Password field with a show/hide visibility toggle icon inside it; the placeholder text differs by mode.
  - An inline error message area for validation or server-rejection errors.
  - Submit button — its label changes to "Creating Account…" / "Signing In…" with a spinner while the request is in flight.
  - A mode-switch line beneath the form ("Already have an account? Sign in" / "Don't have an account? Create one").
- A "← Back to Home" link below the card, returning to marketing mode.

**Validation:** sign-up requires a non-empty name; both modes require an 8+ character password. Switching between sign-in and sign-up clears all fields and any prior error.

---

## 4. Screen: Onboarding

Reached only right after signup, and only if onboarding hasn't been completed yet. Offers two interchangeable entry modes with a toggle button to switch between them at any time; progress made in one mode is not shared with the other.

### 4.1 Form wizard mode (default)
- Header: logo + wordmark, and an "Onboard with Ryna instead" button that switches to chat mode.
- A step-progress bar: one circular indicator per step (6 steps total — Identity, Pillars, Categories, Goals, Schedule, Coach), connected by a line; completed steps show a checkmark, the current step is outlined, and each has a small label underneath (labels hide on very narrow screens).
- A step header: "Step X / 6" eyebrow, a large step title, and a one-line description of that step's purpose.
- The step content itself, in a card, one of:
  1. **Identity** — Full Name + Email (two fields side by side); "What do you do?" — a grid of preset occupation options (icon + label each, single-select); "Do you have a 9-5 job?" Yes/No toggle, which reveals Work Start Time + Work End Time fields when Yes is selected; Timezone dropdown + Weekly Hours Available number field (side by side).
  2. **Pillars** — a vertical list of selectable pillar rows (icon, name, description, and optional small KPI tag chips), each with a checkbox-style selected indicator; user-added custom pillars additionally show a remove (×) control; below the list, a text field + "Add" button to create a custom pillar.
  3. **Categories** — an intro sentence explaining these represent whole-life development areas, not just work; a 2-column grid of selectable category cards (icon, name, short description); a live running count of how many are selected.
  4. **Goals** — one block per pillar selected in step 2: a labeled text field ("What does winning look like for [pillar] in 90 days?") plus a row of goal-type chips (e.g. project-style vs. habit-style vs. metric-style) to classify that goal.
  5. **Schedule** — Wake Time + Sleep Time (side by side); a repeatable "Deep Work Windows" list (each row = a start time + an end time, with add/remove controls); an explanatory callout describing how this schedule feeds the day planner.
  6. **Coach** — an explanatory callout about Ryna auto-switching styles based on performance; a vertical list of coach-style options (symbol, name, description, italicized tagline, and a caption describing what performance pattern auto-triggers that style), single-select.
- Footer navigation: "← Back" (disabled on the first step) and a primary "Continue →" button; on the final step this button instead reads "Launch GoalFlow ⚡" and, once pressed, shows a spinner with "Building your system…" while the account finishes provisioning, after which the user lands on the Dashboard.

### 4.2 Chat onboarding mode
- Header: logo + wordmark, and a "Switch to Form" button.
- An eyebrow caption: "Chat Onboarding · Ryna will guide you."
- A scripted, turn-by-turn conversation (assistant asks one question at a time, in order): name → whether the user has a clear direction or is still figuring things out → an occupation preset → 9-5 employment status → life categories to develop (multi-select) → execution pillars to focus on (multi-select) → the single biggest 90-day goal (free text) → preferred coach style (single-select from the styled list, rendered as full option cards within the chat).
- Transcript area: assistant messages left-aligned with a small avatar icon, user messages right-aligned; a 3-dot typing indicator plays between turns.
- The input control at the bottom adapts to the current question's type:
  - Multi-select questions → a wrap of toggle chips + a "Continue with N selected →" button, disabled until at least one is chosen.
  - Single-choice questions → a stacked list of full-width option buttons.
  - Free-text questions → a text field + send button (Enter also sends).
- On completion, a final assistant message plays, then a full-screen loading overlay ("Building your execution system...") appears before redirecting to the Dashboard.

---

## 5. Screen: Dashboard ("Today")

The default landing screen after login/onboarding — today's snapshot and quick task management.

- **Header:** an eyebrow line (today's date + "Day N of sprint"), a large time-of-day greeting with the user's first name, a status line that changes based on today's completion ("Zero tasks done. Start executing." / "All tasks complete. Exceptional." / "N/M tasks done — keep going."), and two action buttons: **Regen Tasks** (regenerates today's AI task list; shows a spinning icon + "Generating..." while working) and **Ask Ryna** (opens the global chat panel).
- **Left column:**
  - **KPI strip** — 3 cards side by side:
    - *Today's Score* — the semi-circular gauge pattern, with an animated numeric score readout underneath.
    - *Streak* — a large animated day-count + "days · don't break it" caption.
    - *Completion* — a large animated percentage + "N/M tasks" caption.
  - **Pillar grid** — 4 cards (one per pillar), each showing: pillar icon, a completion percentage for that pillar today, the pillar name, a "done/total" task count, and a mini segmented progress bar. Clicking a card filters the task list below to that pillar; clicking the same card again clears the filter.
  - **Tasks panel** — a header row with a "Tasks" label, an inline pillar filter chip row (All/Build/Show/Earn/Systemize), and a "+ Add" button; below it, the task list itself — each row has a checkbox to toggle completion, a pillar tag, the task title (struck through once completed), an estimated-duration chip, an "AI-generated" indicator icon where applicable, and a delete button that appears on hover. An empty-list message appears when the filtered list has nothing in it. Pressing "+ Add" opens an inline add-row (pillar dropdown + title field + Add/Cancel) directly in the list rather than a separate modal.
- **Right column:**
  - **Build Hours card** — a large animated hour readout for today, a horizontal slider (0–12 hours, half-hour steps) to log hours worked, scale labels at the low/mid/high end, and a status caption that changes at hour thresholds (e.g. "log your hours" → "good start" → "strong session").
  - **"This Week" stats card** — four label/value rows: average score, build hours this week, tasks completed this week, current level.
  - **Daily Reflection card** — collapsible. Collapsed state shows a "tap to add reflection" hint. Expanded state shows three short free-text prompts (Accomplished / Blocked / Grateful) and a "Save Reflection" button (shows a "Saving…" state while submitting).

---

## 6. Screen: Planner (24-hour day planner)

The hour-by-hour schedule for the current day.

- **Header:** date label, "Day Planner" title, a live "NOW: HH:MM" readout, and action buttons: **Sync Goals**, a **Notifications** bell (shows an unread-count badge and opens a dropdown panel listing notification entries), **+ Add Block**, **AI Reshuffle**, and **Ask Ryna**.
- **View toggle:** switches the schedule between a **Timeline** view and a **List** view; alongside it, a "next block starts in…" indicator.
- **Add Block form** (toggled open by the header button): a label field, a start-time field, duration presets as quick-pick chips (plus custom duration), and a category picker — an icon grid covering roughly 14 block categories (sleep, spiritual, exercise, transit, deep work, meals, admin, show, earn, buffer, personal, learning, social, health, work). Save/Cancel actions.
- **Timeline view:** a vertical 24-hour ruled scale with hourly gridlines and a live "now" marker line; each scheduled block renders as a pill positioned and sized according to its start time and duration, labeled with its category icon and title. Clicking a block opens an inline block-editor overlay directly over it (edit label, time, duration, category; mark complete or skipped; delete).
- **List view:** the same schedule as chronological rows instead — each row shows the time, a category icon, the label, the duration, an optional linked-task/pillar tag, and complete/skip action buttons. Clicking a row opens the same inline block editor.
- **Right panel** (present in both views):
  - **Day Score card** — a percentage figure plus a breakdown bar split into done/skipped/remaining segments.
  - **Life Metrics card** — a 2×2 grid (Sleep, Spiritual, Exercise, Focus), each with an ok/warning status indicator; sleep shows additional warning text when relevant.
  - **24H Allocation card** — a stack of horizontal bars showing how the day's time breaks down by category.
  - **"Ryna Says" card** — a short block of contextual advice text generated from the day's current state, plus a "Something came up? Tell Ryna" button that opens the global chat panel.

---

## 7. Screen: Tasks

The full task board, independent of the planner's time-slotting.

- **Header:** date, "Tasks" title, a completed-count summary, scheduled/unscheduled count badges, an **AI Generate** button, and a **+ Add Task** button.
- **"Goal-to-Task Intelligence" banner:** explains how today's tasks map back to the user's active goals; an expandable "View Spread" section reveals a 2-column grid of goal cards (title, pillar tag, progress bar) showing how much of each goal's weekly plan is represented in today's task list.
- **Pillar summary row:** 4 clickable filter buttons (icon, pillar name, completion percentage, mini segmented bar) — clicking filters the list below.
- **Status filter row:** All / Pending / Done / Skipped chips.
- **Task list:** each row — checkbox toggle, title + description, a time-slot badge when the task is scheduled, a pillar tag, an "AI-generated" indicator icon where applicable, and edit/delete icon buttons that appear on hover. Clicking edit expands an inline editor in place (editable title, description, time, duration, pillar; save/cancel).
- **Empty state:** explanatory message + a "Clear Filters" button.
- **Add Task modal:** a pillar picker (4-icon grid), a title field, a description textarea, a start-time field, a duration slider with 4 Pomodoro-style duration presets as quick picks, a note that the task will also appear on the planner's timeline, and Cancel/Add actions.

---

## 8. Screen: Goals

90-day goal tracking, one goal per pillar typically.

- **Header:** "90-Day Sprint Goals" eyebrow, "Goals" title, an **AI Planner** button (opens the page's own embedded Goal-Planner chat panel described below — not the global Ryna panel), and a **+ New Goal** button.
- **Pillar filter row:** All + one chip per pillar.
- **Goals grid (left):** one card per goal — pillar symbol + pillar tag, title, description, a progress percentage + segmented bar, a "days left" or "overdue" caption, and a milestone completion count ("N/M milestones"). Clicking a card selects it (shown in the right panel); clicking the selected card again deselects it.
- **Empty state:** icon + "No goals yet" (or "Nothing under [pillar]" when a filter has no matches) + explanatory copy + a "+ New Goal" button.
- **Right panel:**
  - **No goal selected:** a "Goal Overview" card — one row per pillar showing that pillar's active goal progress (percentage + segmented bar).
  - **Goal selected — detail card:**
    - Header: pillar tag, a delete-goal icon button (confirms via a simple yes/no confirmation before deleting), and a close (×) button; below that, the goal's title and description.
    - Progress: percentage readout + segmented bar + a draggable slider to manually adjust progress.
    - **Milestones section:** a list of milestone rows (a toggle-complete checkbox, the title — struck through when done, a due date, and a delete button on hover); "+ Add" opens an inline add-row (title field + date field + Add button).
    - **"This Week's Plan" section:** free-text weekly plan for that goal, shown as read-only text with an "Edit Plan" link when one exists, or a "+ Add a plan for this week" prompt when it's empty; editing swaps in a textarea with Save/Cancel.
  - **"Ryna — Goal Planner" chat card:** a smaller, self-contained chat embedded on this page specifically for goal-planning conversation (separate history from the global Ryna panel) — scrollable message history, a typing indicator, and a text field + Send button.
- **New Goal modal:** a title field, an optional "why it matters" textarea, a pillar picker (chip row), a goal-type picker (chip row, each option has a tooltip description), a target-date picker, and Cancel/Create actions (Create shows a "Creating…" state).

---

## 9. Screen: Analytics

Historical performance reporting, split into three tabs.

- **Header:** a 3-way tab switcher — **Overview / Performance / Pillars**.
- **KPI row (always visible, all tabs):** 4 cards with animated readouts — Current Score, Streak, Build Hours, Tasks Done.
- **Overview tab:** a score-over-time line chart, a pillar-distribution pie chart, and a build-hours bar chart.
- **Performance tab:** a "Weekly Report" card (a narrative summary paragraph, a bulleted list of highlights, a bulleted list of areas to improve), a "Ryna's Weekly Insight" card (a short block of AI-generated commentary), and a vertical bar chart of tasks completed per day.
- **Pillars tab:** 4 per-pillar cards, each with a percentage readout and a segmented progress bar, plus a combined score/hours trend line chart underneath.

---

## 10. Screen: Leaderboard

Global ranking against other users.

- **Header:** "Global Rankings · Top Achievers" eyebrow, "Leaderboard" title, and a 3-way tab toggle — **This Week / All Time / Streak** — which re-sorts the whole list by that metric.
- **Podium:** the top 3 entrants shown as 3 cards arranged in 2nd/1st/3rd visual order — rank badge, a crown icon on 1st place, an avatar-initial box, an optional earned-badge emoji, name, level label, and the tab-relevant stat (score, streak, or XP depending on the active tab). If there are fewer than 3 real entrants (e.g. right after launch), missing podium slots render nothing rather than breaking the page.
- **Full ranked list:** a header row (Rank / Member / Level / Streak / Score / XP — some columns hide on narrow screens), then one row per entrant: rank (a medal emoji for the top 3, otherwise "#N"), an avatar-initial box, name (the current user's own row is visually highlighted and tagged "(you)"), up to 3 pillar-tag chips, level, streak (with a flame icon that highlights at a 14+ day streak), score, and XP.
- **"Your Position" summary card** (shown only if the current user appears on the list): a one-line rank/streak/XP summary, an encouraging message that changes depending on how close to the top 3 the user is, and an "XP to next rank" readout.
- **"Your Badges" section** (shown only if the user has earned at least one): a wrap of badge chips (icon, label, rarity tag).

---

## 11. Screen: Settings

Account management, split into 4 tabs via a left-hand sub-nav (plus a Sign Out action at the bottom of that same nav).

### 11.1 Profile tab
- **Identity card:** an avatar-initial box with a level-number badge overlaid on its corner; the user's name plus a level-title tag; email; an XP progress bar with "Level X → Y" and "current/next XP" captions.
- **"Level Roadmap":** a horizontal scrollable row showing every level milestone (number + label) — past levels shown as achieved, the current level highlighted, future levels dimmed.
- **Stats row:** 4 cards — Streak, Best Streak, Tasks Done, Week Score — each with an icon.
- **"Badges Earned":** an earned-count fraction ("N / M"), then a wrap showing every possible badge (icon, label, rarity) — earned ones shown normally, unearned ones dimmed and tagged "Locked."
- **Editable fields:** Full Name, Occupation (side by side), Timezone dropdown, and a Coach Style picker (same list pattern as onboarding — symbol, name, tagline, single-select).
- **Footer:** "Save Changes" button (briefly shows a "✓ Saved" confirmation state after success) and a "Delete Account" text link.

### 11.2 Notifications tab
- **Push Notifications toggle card:** a status caption reflecting the actual current browser permission state (not supported / blocked / active); the toggle itself subscribes or unsubscribes this device, showing a "Working…" state and any inline error. When enabled, a "Send test notification →" link appears (shows a sending/result state inline).
- **6 individual preference toggles**, each with a one-line description of when it fires: Morning Briefing, Block Transitions, Task Reminders, Ryna Coach Nudges, Evening Reflection, Weekly Report.
- **Two time pickers:** Briefing Time, Reflection Time.

### 11.3 Appearance tab
- A row of accent-color swatch options (presented as a visual preference, though not functionally connected to anything today).
- An app version / build info line.

### 11.4 Security tab
- **Change Password:** current password, new password, confirm new password fields; inline validation/error or success messaging; an "Update Password" button (loading state while submitting).
- **"Active Sessions":** a single row representing the current session (device type + timezone, tagged "Active") — there's no list of other devices to individually revoke.
- **"Danger Zone":** a "Sign Out All Sessions" button.

### 11.5 Delete Account modal (triggered from the Profile tab)
A typed-confirmation modal: warns the deletion is permanent and lists everything it removes (profile, goals, tasks, planner blocks, daily logs, streak/stats, Ryna conversation history); the destructive "Delete Forever" button stays disabled until the user types the literal word "DELETE" into a field; shows a "Deleting…" state and any server error inline; includes a Cancel option.

---

## 12. Out of scope

- `MobileSpec.tsx` — a leftover route that only redirects to the dashboard; it has no UI of its own and isn't a real screen.
- A handful of unused generic component files exist in the codebase (badge/button/card/input/panel/progress-ring/spinner/tag/tooltip variants) that aren't actually referenced by any screen — they're dead code, not part of the live UI, and don't need to be carried into the redesign.

---
name: GoalFlow
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e5e1e6'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e5e1e6'
  inverse-on-surface: '#303033'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#131316'
  on-background: '#e5e1e6'
  surface-variant: '#353438'
  electric-violet: '#8B5CF6'
  vivid-emerald: '#10B981'
  warm-amber: '#F59E0B'
  coral-red: '#EF4444'
  pillar-build: '#F97316'
  pillar-show: '#14B8A6'
  pillar-earn: '#FACC15'
  pillar-systemize: '#64748B'
  glass-stroke: rgba(255, 255, 255, 0.12)
  glass-fill: rgba(15, 15, 20, 0.7)
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  numeric-stat:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  eyebrow:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-info:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter-sm: 12px
  gutter-md: 20px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system embodies a **high-performance, technical, and futuristic** aesthetic. It is tailored for power users who view productivity as an engineering discipline. The brand personality is focused, intelligent, and authoritative, yet motivating through the presence of Ryna, the AI coach.

The chosen style is **Dark-Mode Glassmorphism**. This approach uses deep, obsidian surfaces layered with translucent "frosted" panels. The goal is to create a sense of infinite depth, where data feels like it is floating in a structured digital void. Visual interest is maintained through vibrant, blurred ambient gradients that sit behind the glass layers, suggesting energy and "live" system activity.

**Key Stylistic Principles:**
- **Optical Precision:** Use ultra-thin hairlines (0.5px) for borders to catch "light" on the edges of glass panels.
- **Atmospheric Depth:** Rely on background blurs (20-40px) rather than heavy shadows to separate layers.
- **Kinetic Energy:** Use pulsing status indicators and animated numeric transitions to make the system feel "alive" and responsive.

## Colors

The palette is optimized for a **Dark-First** experience. The base is a deep obsidian charcoal (#0B0B0E), which provides the maximum contrast for the vibrant functional colors.

### Functional Palette
- **Primary (Electric Indigo/Violet):** Reserved for the core interactive path, Ryna AI elements, and primary CTAs.
- **Success (Emerald):** Used exclusively for "Executed" states, completed streaks, and positive momentum.
- **Urgent/Blocked (Amber/Coral):** Used for warnings (e.g., low sleep) or destructive actions (e.g., "Delete Forever").

### Pillar System
The four pillars use distinct hues to allow for instant categorical recognition across the dashboard and planner:
- **Build:** Warm Orange
- **Show:** Cool Teal
- **Earn:** Gold/Yellow
- **Systemize:** Muted Slate Blue

### Ambient Gradients
To achieve the glassmorphic effect, place soft, low-opacity radial gradients (blobs) of `#7C3AED` and `#14B8A6` in the background (Z-index 0). These should shift slightly or pulse to indicate "System Online" status.

## Typography

This design system uses **Inter** for its neutral, highly legible characteristics and excellent support for tabular numerals. 

**Key Typographic Rules:**
- **Numeric Emphasis:** For all scores, XP, and timers, use the `numeric-stat` token. It is essential to enable `tabular-nums` (tnum) via font-feature-settings to prevent horizontal jitter during counting animations.
- **Hierarchy:** Use the `eyebrow` style for metadata like "DAY 12 OF SPRINT" to create a structured, dashboard-like feel.
- **High Contrast:** All text on glass surfaces should be either White (#FFFFFF) or high-brightness Silver (#E2E8F0). Avoid using mid-tones as they disappear behind the frosted blur.
- **Mobile Scaling:** For mobile devices, `display-hero` should scale down to 32px to ensure titles do not wrap awkwardly.

## Layout & Spacing

The system follows a **4px base grid** with a mobile-first philosophy.

**Layout Models:**
- **Mobile:** Uses a single-column stack with a floating pill-shaped navigation bar anchored at the bottom. Safe area insets must be respected for gesture-based navigation.
- **Desktop/Tablet:** Transitions to a 12-column fluid grid. A fixed-width sidebar (240px) handles primary navigation, while the main content area utilizes a two-column split: left for execution (Tasks/Planner) and right for intelligence (Stats/Ryna AI).

**Spacing Rhythm:**
- Use `gutter-md` (20px) for spacing between major glass cards.
- Use `gutter-sm` (12px) for internal padding within cards to maintain high information density without feeling cramped.

## Elevation & Depth

Hierarchy is communicated through **translucency and backdrop filters** rather than traditional drop shadows.

- **Level 0 (Base):** Deep obsidian (#0B0B0E) with ambient blurred color blobs.
- **Level 1 (Surface):** The primary glass layer (Cards, Planner blocks). Background blur: 24px. Border: 0.5px solid white (12% opacity).
- **Level 2 (Float):** Floating Navigation Pill and Ryna AI panel. Background blur: 40px. Border: 0.5px solid primary-violet.
- **Level 3 (Overlay):** Modals and Bottom Sheets. These trigger a global backdrop dimming of the layers below.

**Glass Edge Effect:** To simulate light hitting the top edge of a panel, use a linear gradient for the border: `linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))`.

## Shapes

The shape language is **distinctly rounded**, creating a modern, approachable contrast to the dark, technical color palette.

- **Cards & Panels:** Use 20px (rounded-lg) to 24px (rounded-xl) for large containers.
- **Interactive Elements:** Buttons and input fields use 12px (rounded-md).
- **Navigation & Chips:** The bottom navigation bar and pillar tags use a full **Pill-shape** (height / 2) to distinguish them as floating or filterable elements.
- **Progress Bars:** Use a "Segmented" approach. Instead of a single continuous fill, use a series of small, rounded rectangles (4px width) to represent progress increments.

## Components

### Buttons
- **Primary:** Gradient fill (Electric Indigo to Violet) with white text.
- **Glass/Ghost:** Background blur (20px) with 0.5px white border. Used for secondary actions.
- **Destructive:** Coral Red border and text, only filling on hover or focus.

### Navigation
- **Floating Pill Bar (Mobile):** A centered, high-blur glass container housing 4-5 icons. The active state is indicated by a sliding Violet dot or glow underneath the icon.

### Cards & Gauges
- **Pillar Summary Cards:** Feature a large semi-circular gauge at the top. The "gauge path" is a low-opacity version of the pillar color, while the "fill path" is the vibrant pillar color.
- **Task Rows:** Use "Inline Expandable" behavior. Tapping a row expands it vertically to reveal the editor; it should not push the user to a new screen.

### Input Fields
- **Glass Inputs:** Subtle 0.5px border. On focus, the border color transitions to Electric Violet with a faint outer glow.
- **Typed Confirmation:** For destructive actions, provide a field that requires the user to manually type "DELETE".

### Ryna AI (Floating Panel)
- A dedicated glass component with a "System Online" pulsing green dot in the header. Messages should appear with a soft fade-in and slide-up transition.


# UI Refresh: Dark Header & Nav with Refined Cards

## Problem
The current all-cream UI feels flat and monotone. The header, content, and nav bar all blend together without strong visual hierarchy.

## Approach
Invert the header bar and bottom nav to a dark charcoal/near-black, creating contrast anchors at top and bottom that frame the cream content area. This is a common pattern in premium fintech apps (Robinhood, Coinbase) and gives the app immediate visual weight without changing the overall warm feel.

## Changes

### 1. `src/index.css` — Add dark header/nav CSS variables
Add custom properties for the dark chrome:
- `--chrome: 220 13% 12%` (near-black)
- `--chrome-foreground: 0 0% 95%` (off-white text)

### 2. `tailwind.config.ts` — Register chrome colors
Add `chrome` and `chrome-foreground` to the color config so we can use `bg-chrome` and `text-chrome-foreground`.

### 3. `src/pages/Index.tsx` — Apply dark chrome to header & nav
- **Top header**: Change from `bg-card/80` to `bg-chrome` with `text-chrome-foreground`. Update the "Hedge AI" text and back arrow to use the light foreground. The bookmark icon adapts too.
- **Bottom nav**: Change from `bg-card/90` to `bg-chrome`. Update icon and label colors to use `text-chrome-foreground/60` (inactive) and `text-white` (active), with the primary accent kept for the active state.
- **Detail header**: Same dark treatment for consistency when viewing a research result.

### 4. Minor card refinements
- Slightly increase border radius on the search input for a softer feel.
- Add a subtle shadow (`shadow-sm`) to the "Hottest Bets" event cards on hover for depth.

## Visual Result

```text
┌──────────────────────────┐
│  ██████ DARK HEADER █████ │  ← near-black with white text
├──────────────────────────┤
│                          │
│   cream background       │  ← unchanged warm content area
│   with white cards       │
│                          │
├──────────────────────────┤
│  ██████ DARK NAV ████████ │  ← near-black with icon tabs
└──────────────────────────┘
```

This creates a strong visual frame while preserving the warm, approachable content area. No structural changes — just color swaps on the chrome elements.


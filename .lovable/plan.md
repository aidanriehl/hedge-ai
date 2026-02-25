

## Problem

The app uses Inter for everything, which makes it look like a generic template. The user wants a more distinctive, premium feel — especially for the "Hedge AI" logo and section headings.

## Recommendation

**Space Grotesk** — a modern geometric sans-serif with distinctive character shapes. It's free on Google Fonts, pairs well with Inter, and gives a fintech/data-forward vibe that fits a prediction market app. Other options: DM Sans (softer), Sora (techy), or Instrument Sans (editorial).

## Changes

### 1. `src/index.css` — Add Space Grotesk import

Add `Space+Grotesk:wght@500;600;700` to the existing Google Fonts import.

### 2. `tailwind.config.ts` — Add `font-display` family

Add a `display` font family entry: `['Space Grotesk', ...sans-serif]`.

### 3. `src/pages/Index.tsx` — Apply to logo

Change the "Hedge AI" `<h1>` to use `font-display` class.

### 4. `src/components/SearchScreen.tsx` — Apply to section headings

Add `font-display` to major headings like "Trending" and category headers.

### 5. `src/components/ResearchResult.tsx` — Apply to research headings

Add `font-display` to the research result title and category headings.

This is a small change — just a font import, one Tailwind config line, and sprinkling `font-display` on ~5-8 heading elements.


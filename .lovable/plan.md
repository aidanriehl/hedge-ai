

## Problem

Adding `with_nested_markets=true` to every paginated events request would increase payload size ~2-3x and add 1-2 seconds to initial load — unacceptable.

## Solution: Background Enrichment

Load events fast first (no markets), then silently fetch market data in the background. Prices appear a moment after events load — no blocking.

### Changes

#### 1. `src/lib/api.ts` — Add a background market-enriched fetch

Add a new function `fetchAllKalshiEventsWithMarkets` that mirrors `fetchAllKalshiEvents` but passes `with_nested_markets=true`. The existing `fetchAllKalshiEvents` stays unchanged (fast initial load).

#### 2. `src/pages/Index.tsx` — Two-phase loading

- Phase 1 (existing): Fetch events without markets → instant search works
- Phase 2 (new): After phase 1 completes, trigger a background fetch with `with_nested_markets=true` and merge the market data into the existing events state

The user sees search results immediately. A moment later, candidate names and prices silently appear on those results.

#### 3. `supabase/functions/kalshi-proxy/index.ts` — Support the param

Pass through a `with_nested_markets` parameter when provided, so the proxy forwards it to Kalshi's API.

### User Experience

- Initial load speed: **unchanged**
- Search results appear: **immediately** (same as today)
- Candidate names/prices appear: **1-2 seconds after initial load**, silently in background
- No spinners, no blocking, no degradation


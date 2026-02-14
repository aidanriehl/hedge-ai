

# Sort Hottest Bets by Volume (Most Money in the Pot)

## Problem
The "Hottest Bets" section currently just picks the first 3 events from the Kalshi API in arbitrary order. There's no ranking by popularity or trading volume.

## Solution
Create a new backend function endpoint that fetches events, then for each event fetches its markets to get volume data, ranks them by total volume, and returns the top 3 from unique categories.

## How It Works

1. **New backend function: `hot-events`** -- A dedicated function that:
   - Fetches the first 100 open events from Kalshi
   - For the top ~20 events (to limit API calls), fetches their market details in parallel to get volume data
   - Sums up `volume` across all markets per event to get total volume
   - Sorts by total volume descending
   - Returns the top 3 from unique categories (no two bets from the same category)

2. **New API function `fetchHotEvents()`** in `src/lib/api.ts` that calls this backend function

3. **Update `Index.tsx`** to call `fetchHotEvents()` on load and pass the results to `SearchScreen`

4. **Update `SearchScreen.tsx`** to accept `hotEvents` as a prop instead of computing them from the events list

## Technical Details

### Backend function (`supabase/functions/hot-events/index.ts`)
- Fetches `/events?limit=100&status=open` from Kalshi
- Takes the first 20 events, fetches `/events/{ticker}` for each in parallel to get market volume
- Computes total volume per event (sum of all market volumes)
- Filters to top 3 unique categories, sorted by volume
- Returns enriched events with volume data and first market price

### Frontend changes
- `src/lib/api.ts`: Add `fetchHotEvents()` function
- `src/pages/Index.tsx`: Call `fetchHotEvents()` in `useEffect`, store in `hotEvents` state, pass to `SearchScreen`
- `src/components/SearchScreen.tsx`: Accept `hotEvents` prop, use it directly for the "Hottest Bets" section instead of the `hottestBets` useMemo. Add `KalshiMarket` type to include volume in the event type so we can show market prices
- `src/types/kalshi.ts`: Add `total_volume` optional field to `KalshiEvent`


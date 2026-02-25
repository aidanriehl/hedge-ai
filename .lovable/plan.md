

## Analysis

Currently, the app fetches only **100 events** from Kalshi in a single API call (`limit: "100"`). Kalshi has hundreds (sometimes 1000+) of open events, so users can't find many bets.

This is purely a data-fetching issue — no heavy computation is needed. The Kalshi API supports cursor-based pagination, and the proxy already passes the `cursor` parameter. We just need to loop through all pages.

## Plan

### 1. Update `fetchKalshiEvents` to paginate through ALL events

Modify `src/lib/api.ts` to add a new function `fetchAllKalshiEvents()` that loops through pages using the cursor until no more results are returned. Each page fetches 200 events (Kalshi's max per request). Accumulates all events into a single array.

### 2. Update `src/pages/Index.tsx` to call the new function

Replace the single `fetchKalshiEvents()` call in `loadEvents()` with the new `fetchAllKalshiEvents()` call. Remove the unused `loadingMore` state and cursor logic since we'll load everything upfront.

### 3. Update the proxy to support higher limits

Update `supabase/functions/kalshi-proxy/index.ts` to pass through whatever limit is requested (currently hardcoded default of "100", will use "200" per page).

### Performance Notes

- Each page is a lightweight JSON response (~50KB for 200 events)
- Typically 3-6 API calls to get all events (600-1200 total)
- All fetched in parallel-ish (sequential due to cursor, but fast — ~2-3 seconds total)
- Events are stored in memory as a flat array for client-side filtering — no heavy computation, just string matching on search
- The search input already limits display to 15 results, so rendering stays fast




## Changes

### 1. Update placeholder text
In `src/components/SearchScreen.tsx`, change the search input placeholder from `"Search markets"` to `"Search bet or topic"`.

### 2. Searching by topic (e.g. "tennis")
This **already works** with zero additional effort. The current filter does a simple `string.includes()` check against every event's `title` and `category`. Since all events are already loaded in memory (from the pagination change), searching "tennis" will instantly surface any bet with "tennis" in the title or category.

No extra API calls, keyword indexing, or computing power needed — it's pure client-side string matching on ~1000 events, which is trivially fast.

The only edge case: if Kalshi titles don't literally contain "tennis" (e.g., a bet titled "Will Djokovic win Wimbledon?" without the word "tennis"). To handle that, we could optionally also search the `sub_title` field if available. This is a one-line addition to the filter.

### Summary of code changes
- **`src/components/SearchScreen.tsx`**: 
  - Change placeholder to `"Search bet or topic"`
  - Add `sub_title` to the search filter for broader topic matching


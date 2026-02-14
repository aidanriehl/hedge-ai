

## BetScope UI and Caching Overhaul

### 1. Redesigned Search/Explore Screen

The explore screen will be simplified to a centered, hero-style layout:

- Large centered title: **"Search Your Bet"**
- Subtitle below: **"Research to make an informed decision"**
- Prominent search bar centered below the subtitle
- Below the search bar, a small section titled **"Hottest Bets Right Now"** showing only **3 bets** (picked from the events list — the first 3 or those with highest volume/market activity)
- Each hot bet card shows the category icon, title, and market price
- When the user types in the search bar, search results replace the hottest bets section (same as current filtered behavior)

### 2. Research Result Caching

Currently, every time you tap a bet it re-fetches research from scratch. We will add an in-memory cache:

- A `Map<string, { research: ResearchResult; marketPrice?: number }>` stored in React state on the Index page
- When a bet is selected, check the cache first. If found, instantly show the cached result (no loading, no API call)
- Only run research if the bet hasn't been researched yet in this session
- This means tapping the same bet twice shows identical results instantly

### 3. Enhanced Saved Bets View

Saved bet cards will be richer, showing cached research data when available:

- Left side: circular image thumbnail (from `research.imageUrl`) or a category icon fallback
- Center: bet title and category
- Bottom/right: the AI probability percentage (e.g., "76% Yes") or, for candidate bets, the top candidate name and percentage (e.g., "Dua Lipa - 35%")
- A small progress bar at the bottom of the card showing the probability visually

### Technical Details

**Files to modify:**

1. **`src/pages/Index.tsx`**
   - Add a `researchCache` state: `Map<string, { research: ResearchResult; marketPrice?: number }>`
   - In `handleSelectEvent`, check cache before calling APIs. If cached, set state from cache and skip fetch
   - After successful research, store result in cache
   - Pass `researchCache` to `SavedBets` rendering so saved cards can show cached data
   - Keep the bottom nav as-is (Explore left, Saved right)

2. **`src/components/SearchScreen.tsx`**
   - Replace the headline with centered "Search Your Bet" / "Research to make an informed decision"
   - Remove the grouped-by-category layout for the default (no query) view
   - Add a "Hottest Bets Right Now" section showing exactly 3 events with category icons and market prices
   - Keep the search/filter behavior for when users type a query (show filtered results grouped or flat)

3. **`src/pages/Index.tsx` (saved tab section)**
   - Redesign saved bet cards to show: circular image (from cache), title, category, and AI probability or top candidate with percentage
   - Add a thin progress bar at the bottom of each card representing the probability


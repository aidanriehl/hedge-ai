

## Problem

Kalshi tennis bets use terms like "ATP", "WTA", "Wimbledon", "Roland Garros" — never the literal word "tennis." The same applies to many other sports and topics (e.g., searching "basketball" won't find "NBA" bets, "soccer" won't find "Premier League" bets).

## Solution: Synonym/Keyword Expansion

Add a synonym map so that when a user types a broad term, the search also checks related terms. This is zero-cost — pure client-side string matching, no extra API calls.

### Changes to `src/components/SearchScreen.tsx`

1. Add a `SEARCH_SYNONYMS` map at the top of the file:
```typescript
const SEARCH_SYNONYMS: Record<string, string[]> = {
  tennis: ["atp", "wta", "wimbledon", "roland garros", "us open tennis", "australian open", "french open"],
  basketball: ["nba", "ncaa basketball", "march madness", "wnba"],
  soccer: ["premier league", "la liga", "champions league", "mls", "fifa", "world cup soccer"],
  football: ["nfl", "super bowl", "touchdown"],
  baseball: ["mlb", "world series"],
  hockey: ["nhl", "stanley cup"],
  golf: ["pga", "masters", "ryder cup"],
  boxing: ["ufc", "mma", "fight"],
  racing: ["f1", "formula 1", "nascar", "grand prix"],
  crypto: ["bitcoin", "ethereum", "btc", "eth", "solana", "dogecoin"],
  ai: ["artificial intelligence", "openai", "chatgpt", "gpt", "machine learning", "agi"],
  elections: ["democrat", "republican", "gop", "presidential", "senate", "congress", "governor"],
  weather: ["hurricane", "tornado", "temperature", "heat wave", "drought", "flood"],
};
```

2. Update the `filtered` useMemo to expand the search query with synonyms before matching:
```typescript
const filtered = useMemo(() => {
  if (!query) return [];
  const q = query.toLowerCase();
  // Build list of terms to search: the query itself + any synonyms
  const searchTerms = [q];
  for (const [key, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
    if (q.includes(key)) searchTerms.push(...synonyms);
    if (synonyms.some(s => q.includes(s))) searchTerms.push(key);
  }
  return events.filter((e) =>
    searchTerms.some(term =>
      e.title.toLowerCase().includes(term) ||
      e.category?.toLowerCase().includes(term) ||
      e.sub_title?.toLowerCase().includes(term) ||
      e.markets?.some((m) => m.title?.toLowerCase().includes(term))
    )
  );
}, [events, query]);
```

### Performance

- Still pure client-side string matching, just checking a few extra terms per search
- No additional API calls
- Negligible CPU cost — checking ~15 extra strings against ~1000 events is trivial




## Smart Cache with AI-Determined TTL

### Core Idea
Instead of computing TTL from close_time, add a `cacheTTLHours` field to the research prompt. Claude picks the appropriate duration based on topic volatility when it generates the research.

### Examples of what Claude would return:
- "Who will be the first trillionaire?" → `cacheTTLHours: 168` (7 days)
- "Will Lady Gaga perform at the Super Bowl?" (event tomorrow) → `cacheTTLHours: 1` (1 hour)
- "Next Pope?" (no conclave scheduled) → `cacheTTLHours: 72` (3 days)
- "Will Bitcoin hit $100k this month?" → `cacheTTLHours: 4` (4 hours)

### Implementation

**1. Database: `research_cache` table**
```sql
CREATE TABLE public.research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ticker TEXT UNIQUE NOT NULL,
  research JSONB NOT NULL,
  steps JSONB,
  image_url TEXT,
  cache_ttl_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- No RLS needed — this is public read data, only written by backend functions
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.research_cache FOR SELECT USING (true);
CREATE POLICY "Service write" ON public.research_cache FOR ALL USING (auth.role() = 'service_role');
```

**2. Add to Claude's research prompt** (in `bet-research/index.ts`)

Add to the JSON output spec:
```
"cacheTTLHours": <integer 1-168> — how many hours this research stays relevant.
  Pick based on how fast the situation changes, NOT when the market closes.
  Fast-moving news/sports → 1-4h. Slow political/science → 48-168h. Default 24h.
```

**3. Edge function changes** (`bet-research/index.ts`)

Before calling AI:
- Query `research_cache` by `event_ticker`
- If found and `expires_at > now()`, return cached result immediately (skip all AI calls)
- If expired or missing, proceed with AI calls as normal

After AI responds:
- Read `cacheTTLHours` from Claude's response
- Upsert into `research_cache` with `expires_at = now() + interval '{cacheTTLHours} hours'`
- Same for steps and image — all cached together

**4. Cache loading steps too**
- Steps are generated separately (via `generateSteps` flag)
- Before calling Gemini for steps, check if `research_cache` has steps for this event ticker
- If yes for steps specifically, return cached steps and skip the AI call

**5. Frontend changes**
- Pass `event_ticker` in the research request body (already available from the event data)
- No other frontend changes needed — caching is transparent

### Flow

```text
User clicks bet
  → Frontend sends { eventTitle, eventTicker, ... }
  → Edge function checks research_cache for event_ticker
     → HIT (not expired): return cached research + steps + image
     → MISS/EXPIRED:
        1. Call Claude for research (includes cacheTTLHours in response)
        2. Call Gemini for steps
        3. Call Gemini for image
        4. Upsert all into research_cache with expires_at
        5. Return fresh results
```

### Cost Impact
- First user to click any bet pays for AI calls
- Every subsequent user gets instant cached results (zero AI cost)
- Cache auto-expires based on Claude's judgment of topic volatility
- Image generation (the most expensive call) only happens once per cache period




## Plan: Remove shared database cache, keep per-user localStorage only

**What changes and why:**  
The backend `research_cache` table currently serves the same research to every user. We'll remove the backend cache lookup for main research so every user gets a fresh AI-generated analysis. localStorage (per-device) still provides instant reload for the same user.

### Changes

**1) `supabase/functions/bet-research/index.ts` — Remove cache hit for main research**
- Delete the "Check cache first" block (lines 264-276) that returns cached research from the database.
- Keep the `upsertCache` call at the end — it still stores steps for the generateSteps endpoint, which is fine (steps are just UX loading labels, not the actual research content).
- Keep the `generateSteps` cache logic as-is (reusing step labels across users is fine since they're just progress indicators like "Check injury reports").

**2) `src/pages/Index.tsx` — Remove `cacheMeta.hit` fast-path from backend**
- The backend will no longer return `cacheMeta.hit = true`, so the special branch (lines 177-183) that skips progress animation for backend-cached results will never trigger.
- Simplify: remove the `if (result.cacheMeta?.hit)` branch. Always fire the steps request and show progress animation for network-fetched research.
- Keep the in-memory + localStorage cache paths (lines 115-136) — these are per-user and should remain.

**3) `supabase/functions/bet-research/index.ts` — Stop returning `cacheMeta` on main research**
- At the end of fresh research generation, remove `result.cacheMeta` from the response (it was only used to signal cache hits).

### Files modified
- `supabase/functions/bet-research/index.ts` — remove cache-hit return block for main research
- `src/pages/Index.tsx` — remove `cacheMeta.hit` branch, always show progress for network requests

### What stays the same
- localStorage per-device caching (instant on revisit for same user)
- In-memory cache (instant within same session)
- Steps caching in DB (just progress labels, not research content)
- Image generation, chat, more-research endpoints — unchanged


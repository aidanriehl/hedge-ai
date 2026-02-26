
Root cause confirmed (from code + logs + DB):
1) Cached research is being hit in backend (log: Cache HIT research for KXPRIMEENGCONSUMPTION-30), but UI still waits because `handleSelectEvent` blocks on `Promise.all([researchPromise, marketPromise])` before `setResearch`.
2) Steps cache has race condition: in `bet-research` generateSteps only persists steps if cache row already exists; first-time flow often generates steps before research row insert, so row saved with `steps=null` (confirmed in `research_cache` rows), causing extra steps-generation on later “cached” opens.
3) Frontend “instant cache” only checks in-memory `researchCache` map, not persistent backend cache metadata, so page reload/session change loses instant behavior.

Implementation plan:
1) `supabase/functions/bet-research/index.ts`
- On cache hit for main research, return:
  - `...research`
  - `cacheMeta: { hit: true, steps: cached.steps ?? [] }`
- In `generateSteps` branch, if cache row missing, write a lightweight row with `event_ticker`, `steps`, and short TTL placeholder so steps are never dropped; if row exists, update steps as today.
- When doing final `upsertCache` after fresh research, preserve existing `steps` if present (don’t overwrite with null).

2) `src/types/kalshi.ts`
- Extend `ResearchResult` with optional `cacheMeta?: { hit?: boolean; steps?: string[] }`.

3) `src/pages/Index.tsx` (`handleSelectEvent`)
- Start market fetch independently, but do not gate first render on it.
- Await `researchPromise` first; immediately `setResearch(result)` on resolve.
- If `result.cacheMeta?.steps?.length`, set `researchSteps` from it and skip calling `generateSteps`.
- Only call `generateSteps` when no cached steps are provided.
- Keep market request in background; update `marketPrice` / `marketCandidates` when it finishes.
- Persist in-memory cache immediately after research resolve, then patch market fields when market fetch returns.

4) `src/pages/Index.tsx` cache fast-path hardening
- Keep current in-memory fast-path, but ensure it never sets `researching=true` for known cached items.
- Add dedupe guard for repeated clicks on same ticker while request in flight.

5) Validation checklist (must all pass before closing)
- A previously cached ticker opens immediately after tap (research cards render before market price request completes).
- No progress pills show for cached opens (including after full page refresh).
- `research_cache.steps` remains populated for newly researched events (no new rows with null steps after first run).
- Non-cached opens still show progressive steps and complete normally.
- Reopen same event 3 times in a row: no regressions, no “blank waiting” state.

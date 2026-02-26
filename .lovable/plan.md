
Implementation plan

1) Fix the unwanted “Starting research...” pill at its source  
- File: `src/components/ResearchProgress.tsx`  
- Remove the special `steps.length === 0` render block entirely.  
- If `steps` is empty, render nothing (so no random placeholder pill appears).

2) Prevent the progress component from mounting before real steps exist  
- File: `src/pages/Index.tsx`  
- Change render condition from:
  - `researching && <ResearchProgress ... />`
  to:
  - `researching && researchSteps.length > 0 && <ResearchProgress ... />`
- This guarantees non-cached bets won’t show a fake initial pill while steps are still being generated.

3) Remove the intentional “hold on last step” behavior  
- File: `src/components/ResearchProgress.tsx`  
- Current logic caps progress at `steps.length - 1`, which intentionally leaves the last row spinning until research finishes.  
- Update interval progression to advance through `steps.length` so the last step gets completed on the same cadence as every other step (1.4s), instead of stalling.

4) Keep timing consistent across all pills  
- File: `src/components/ResearchProgress.tsx`  
- Preserve a single fixed interval (`1400ms`) for each transition.  
- Ensure state math still renders exactly one active spinner while advancing, then all checks once the sequence completes.

5) Eliminate avoidable end-of-sequence waiting caused by step-fetch coupling (hardening)  
- File: `src/pages/Index.tsx`  
- Stop gating final `setResearch(result)` on steps fetch completion (remove strict dependency on `await stepsPromise` before showing result).  
- Steps are UX-only and should not delay final research rendering.

Technical details

- Root cause #1 (first screenshot):  
  `ResearchProgress` explicitly renders a fallback pill when `steps.length === 0`:
  - text: “Starting research...”
- Root cause #2 (second screenshot):  
  `ResearchProgress` intentionally blocks final completion with:
  - `maxComplete = steps.length - 1`
  - “Don’t mark the last step as done until research is actually complete”
  This is exactly why the last pill appears stuck longer than others.
- Secondary latency amplifier:  
  In `Index.tsx`, research result rendering currently waits for steps request completion, which can add extra end delay unrelated to core research readiness.

Acceptance criteria after implementation

- Non-cached event open: no “Starting research...” pill appears at any time.  
- Progress sequence: every step, including the last, advances at the same 1.4s cadence.  
- No prolonged “last pill spinning” pause before result display.  
- Cached event behavior remains instant and unchanged.

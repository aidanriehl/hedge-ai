

## Problem

When you click a bet:
1. Placeholder steps appear and start animating
2. The `generateSteps` API returns real steps → `setResearchSteps()` replaces the array
3. `ResearchProgress` detects `steps` changed → resets `completedCount` to 0
4. All progress disappears and restarts from scratch — looks like a flash/reset

## Plan

### 1. Fix step replacement in `src/pages/Index.tsx` (~line 183-184)
- Instead of replacing steps when real ones arrive, **don't replace them at all** if the animation is already running
- Remove the `generateSteps` API call entirely — the placeholder steps are good enough and avoid the jarring reset
- The 6 hardcoded placeholders already describe the process well

### 2. Reduce timer from 2.5s to 2.0s in `src/components/ResearchProgress.tsx` (line 36)
- Change `2500` → `2000`

**Result:** Steps appear instantly, animate smoothly at 2s intervals, never reset mid-animation, overflow steps kick in if needed.


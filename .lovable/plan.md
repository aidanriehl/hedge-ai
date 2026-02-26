

## Fix Research Loading Animation Issues

Two bugs identified in `ResearchProgress.tsx`:

### Problem 1: Flash of "Analyzing bet details..."
When `steps` is empty (before the steps API returns), it shows "Analyzing bet details..." Then when steps arrive, that disappears and gets replaced by the real steps — causing a jarring flash/jump.

**Fix**: Remove the empty-state fallback entirely. Instead, in `Index.tsx`, don't render `ResearchProgress` until steps have arrived. The bet title/category header is already visible, so there's no need for a placeholder.

### Problem 2: Last step spins for 10+ seconds
The interval ticks every 1400ms and marks steps as "done" one by one, but stops at the last step (`prev >= steps.length - 1`). The last step just sits there spinning until the actual research API call finishes — which can take 10+ seconds while all other steps completed in ~1.4s each.

**Fix**: Don't stop the interval at the last step. Let the last step also get its checkmark after 1400ms like the others. The spinner should only show on whichever step is currently "in progress." After all steps are checked off, show nothing (or a subtle "Finalizing..." if research hasn't returned yet). This way the pacing feels consistent.

### Files to change
1. **`src/components/ResearchProgress.tsx`**:
   - Remove the `steps.length === 0` fallback block
   - Let the interval run through ALL steps (change `steps.length - 1` to `steps.length`)
   - After all steps complete, show a small "Wrapping up..." spinner if the component is still mounted

2. **`src/pages/Index.tsx`**:
   - Only render `<ResearchProgress>` when `researchSteps.length > 0` (line ~177): `{researching && researchSteps.length > 0 && <ResearchProgress steps={researchSteps} />}`


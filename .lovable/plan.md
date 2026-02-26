

## Improve Research Copy Quality

The user identified 5 specific writing problems in the AI research output. All fixes go into the system prompt in `supabase/functions/bet-research/index.ts` (lines 265-327).

### Problems → Fixes

1. **Vague language** ("closer than expected") — Add rule: never use vague qualifiers; always say specifically how close/far.

2. **Unexplained jargon** ("Artemis") — Add rule: always briefly explain niche terms inline (e.g. "NASA's Artemis program (their Moon landing plan)").

3. **Findings don't tie back to the thesis** — This is the biggest issue. Add a structural rule: the probability reasoning states a thesis, and every bullet must explicitly connect back to supporting or challenging that thesis. No orphaned facts.

4. **Category titles use jargon** ("Hardware Status") — Add rule: category titles must be plain English that anyone would understand. "Hardware Status" → "Who Has the Better Rocket" or similar.

5. **Timid bolding** (only bolding "2030 target" instead of "China announced a 2030 target for crewed lunar landing") — Change bolding rule: bold the full meaningful phrase, not just a single number or word. Bold enough that someone skimming only the bold text gets the story.

### Implementation

Single edit to the system prompt in `supabase/functions/bet-research/index.ts`, adding/replacing rules in the RULES section (~lines 265-327). The "More Research" prompt (~line 191) will also get the same bolding and thesis-connection rules for consistency.


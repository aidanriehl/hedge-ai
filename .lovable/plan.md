

## Problem

The AI-generated image is displayed with `h-48 object-cover`, which crops the image to fit a fixed 192px height. Since the generated image has an unknown aspect ratio (likely square or portrait), important content like faces gets cropped out.

## Solution

Two changes needed:

### 1. Generate images in the correct aspect ratio
Update the image generation prompt in `supabase/functions/bet-research/index.ts` to request a **landscape 16:9 aspect ratio** image, matching the wide display area. This ensures the generated image naturally fits without cropping important content.

**Line ~411**: Change the prompt from:
```
Generate a photorealistic image: ${research.imagePrompt}. High quality, editorial style.
```
to:
```
Generate a photorealistic image in wide landscape 16:9 aspect ratio: ${research.imagePrompt}. High quality, editorial style, wide horizontal composition. Make sure faces and key subjects are fully visible and centered.
```

### 2. Use `object-contain` or keep `object-cover` with `object-top`
In `src/components/ResearchResult.tsx` (line 62), change the image class to use `object-cover object-top` so that even if an image isn't perfectly 16:9, we bias toward showing the top (where faces typically are) rather than center-cropping:

```
className="w-full h-48 object-cover object-top"
```

This two-pronged approach ensures: (a) new images are generated in the right shape, and (b) display always favors showing the top/face area.


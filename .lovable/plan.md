

# Move Price Below Title in Search Results

## What changes

In the search results and hot bets lists, the price (e.g., "7c") currently sits to the right of the title. Move it below the title, matching the saved tab layout where outcome text appears underneath.

## Layout change

**Current:**
```
[icon]  Will Elon Musk visit Mars?          7c
```

**New:**
```
[icon]  Will Elon Musk visit Mars?
        No -- 7c
```

The price will show as "No -- X c" (since Kalshi yes_bid prices below 50 imply "No" is more likely) or "Yes -- X c" beneath the title, left-aligned under the text (not the icon), using the same styling pattern as the saved tab.

## Technical details

**File: `src/components/SearchScreen.tsx`**

Two places to update (search results list and hot bets list -- they share the same card markup):

1. Remove `flex items-center` single-row layout for the text+price area
2. Wrap title and price in a column div
3. Move price below the title as a small label like `"No — 7¢"` or `"Yes — 93¢"` (show "Yes" if price >= 50, "No" with `100 - price` if under 50... or simply show "Yes" price as-is to match Kalshi convention)
4. Style it with `text-xs font-semibold text-primary mt-0.5` to match the saved tab

Since the screenshot shows `7c` which is a low yes price, the display will show the raw yes price (e.g., "7c") below the title, keeping it simple and consistent with Kalshi's convention. Format: just the price on a new line beneath the title, no "Yes/No" prefix needed to keep it clean -- or add "No" prefix if the user prefers. Based on the saved tab pattern showing "76% Yes", the format will be `Xc Yes` beneath the title.


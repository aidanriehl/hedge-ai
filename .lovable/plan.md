

## Fix: Add more bottom padding to chat input bar

**File**: `src/components/ResearchChat.tsx`, line 152

Change `pb-4` to `pb-8` on the fixed input container so the chat bar isn't cut off at the bottom of the screen.

```
// Before
<div className="... px-4 pt-2 pb-4 safe-bottom">

// After
<div className="... px-4 pt-2 pb-8 safe-bottom">
```


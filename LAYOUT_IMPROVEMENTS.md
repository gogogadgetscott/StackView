# Layout Improvements - January 20, 2026

## Changes Made

### 1. Two-Column Layout for "Stacks & Containers"

**File:** `frontend/app/page.tsx`

- **Left Column (1/3 width):** Stacks list with independent scrolling
- **Right Column (2/3 width):** All Containers table with independent scrolling
- **Grid System:** CSS Grid with `grid-cols-3` for proper proportions
- **Height:** Calculated to fit above the fold on 1080p displays (`h-[calc(100vh-200px)]`)
- **Scrolling:** Each column has independent vertical scrolling with custom scrollbar styling

**Benefits:**
- Side-by-side view of stacks and containers
- Better space utilization
- Improved scanning and comparison
- Both sections visible simultaneously on typical monitors

### 2. Status Pill in Header

**File:** `frontend/app/page.tsx`

Replaced:
```
Realtime stats via WebSocket · 1s cadence
```

With:
```
🟢 Connected
```

**Design:**
- Rounded pill shape (`rounded-full`)
- Subtle background (`bg-neutral-900/50`)
- Small, non-intrusive size
- Green indicator dot showing connection status
- High contrast text for readability
- `shrink-0` to prevent flex collapsing

**Benefits:**
- Takes minimal header space
- Subtle visual feedback
- Cleaner, more professional appearance
- Still communicates WebSocket connection status

### 3. Custom Scrollbar Styling

**File:** `frontend/styles/globals.css`

Added custom scrollbar styles for:
- Webkit browsers (Chrome, Safari, Edge)
- Firefox (`scrollbar-width: thin`)
- Tailwind scrollbar utilities

**Features:**
- 6px scrollbar width/height
- Matches dark theme (`#404045` thumb, `#1a1a1f` track)
- Subtle hover state
- Consistent across components

## Technical Details

### CSS Classes Used

- `grid-cols-3` - Three-column grid
- `col-span-1`, `col-span-2` - Column proportions (1:2 ratio)
- `gap-6` - 24px gap between columns
- `min-h-0` - Allows flex children to shrink below content size
- `overflow-y-auto` - Independent scrolling
- `flex-1` - Fill available space
- `rounded-full` - Pill shape
- `bg-neutral-900/50` - Semi-transparent background

### Responsive Considerations

The layout uses fixed grid proportions (1:2 ratio). For mobile/tablet support, consider adding:

```tsx
// Future enhancement: responsive layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

## Testing Updates

Updated `frontend/__tests__/page.test.tsx`:
- Changed test from WebSocket badge to "Connected" pill
- Added test for layout structure (Stacks and All Containers sections)
- Maintains existing title and description checks

## Files Modified

1. ✅ `frontend/app/page.tsx` - Layout restructure
2. ✅ `frontend/styles/globals.css` - Scrollbar styling
3. ✅ `frontend/__tests__/page.test.tsx` - Test updates

## Visual Result

```
┌─────────────────────────────────────────────────────────────┐
│ StackView                                    🟢 Connected    │
│ Stacks & Containers                                         │
│ Unified view of compose stacks...                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────────┐
│                      │                                      │
│  Stacks              │  All Containers                      │
│  ────────────────    │  ──────────────────────────────────  │
│                      │                                      │
│  • Stack 1           │  [Table with horizontal scroll]      │
│  • Stack 2           │                                      │
│  • Stack 3           │  Container 1  │  CPU  │ Mem │ ...   │
│                      │  Container 2  │       │     │ ...   │
│  [scrollable]        │  Container 3  │       │     │ ...   │
│                      │               │       │     │ ...   │
│                      │  [scrollable]                       │
└──────────────────────┴──────────────────────────────────────┘
```

## Next Steps (Optional)

1. Add responsive breakpoints for smaller screens
2. Add resize handles between columns (drag to adjust width)
3. Add "collapse stacks" button to maximize containers view
4. Add WebSocket connection state indicator updates
5. Consider adding sticky headers for both columns when scrolling

# SC Documents Integration Plan

## Overview
Integrate "Cestovný príkaz" and "Vyúčtovanie" document generation into the dochádzka app for consecutive SC (Služobná cesta) days.

## Architecture

### View System
- Single-page app with view switcher (not separate browser tabs)
- Two views: "Dochádzka" (existing) and "SC Dokumenty" (new)
- Toggle via buttons in topbar
- Both views share same state and file handle

### Data Model Extension
Add `scConfig` to existing JSON structure:
```json
{
  "config": { ... },
  "scConfig": {
    "address": "Horná 123, 010 01 Žilina",
    "destination": "Praha, Česká republika",
    "purpose": "Obchodné rokovanie",
    "vehicleType": "osobné motorové vozidlo",
    "licensePlate": "ZA-123AB",
    "kmRate": 0.227
  },
  "months": { ... }
}
```

## Implementation Steps

### Step 1: SC Block Detection
**File:** `index.html` (add function ~line 490)

```javascript
function findSCBlocks(monthKey) {
  // Returns array of SC blocks: [{start: "09", end: "13"}, ...]
  // Consecutive SC days form one block
}
```

### Step 2: View Switcher UI
**File:** `index.html`

1. Add CSS for view tabs (~line 95)
2. Add view toggle buttons after topbar (~line 230)
3. Add `currentView` to state ('dochadzka' | 'sc')
4. Wrap existing table in `<div id="dochadzkaView">`
5. Add `<div id="scView" class="hidden">` for SC documents

### Step 3: SC Config Editor
**File:** `index.html`

Add editable fields in SC view for:
- Address, destination, purpose
- Vehicle info (optional)
- Uses same auto-save pattern as existing data

### Step 4: Document Templates
**File:** `index.html`

Two printable sections inside SC view:

**Cestovný príkaz:**
- Header with company/employee info
- Journey details (start/end datetime)
- Purpose and destination
- Signature with date

**Vyúčtovanie:**
- Table with rows per day:
  - Date | Times | AUS marker | KM | Per diem
- Per diem calculation:
  - 5-12h: €9.30
  - 12-18h: €13.80
  - >18h: €20.60
- Totals row
- Signature with date

### Step 5: Per-Trip Controls
For each SC block, show:
- Date range display
- Start time input (default 04:30)
- End time input (user enters)
- Generate/Print button

### Step 6: Print Styling
**File:** `index.html` (@media print section)

- When printing from SC view, hide dochádzka content
- Page breaks between Cestovný príkaz and Vyúčtovanie
- A4 formatting for official documents

## UI Flow

```
[Dochádzka] [SC Dokumenty]  ← view tabs (SC only shows if SC days exist)
     ↓
  SC View:
  ┌─────────────────────────────────┐
  │ SC Konfigurácia                 │
  │ ├─ Adresa: [___________]        │
  │ ├─ Miesto: [___________]        │
  │ └─ Účel:   [___________]        │
  ├─────────────────────────────────┤
  │ Cesty v mesiaci 01-2026:        │
  │                                 │
  │ ▼ 09.01 - 13.01 (5 dní)        │
  │   Odchod: [04:30]  Príchod: [__:__] │
  │   [Náhľad] [Tlačiť]             │
  │                                 │
  │ ▼ 20.01 - 22.01 (3 dni)        │
  │   ...                           │
  └─────────────────────────────────┘
```

## Files Modified
- `index.html` - all changes (single-file app)

## Key Code Locations to Modify

| Section | Lines | Change |
|---------|-------|--------|
| CSS | 8-220 | Add view tabs, SC document styles |
| HTML structure | 220-290 | Add view container, SC view section |
| State | 319-329 | Add `currentView`, SC trip state |
| Default config | 335-345 | Add `defaultScConfig` |
| SC detection | ~490 | New `findSCBlocks()` function |
| Render | 801-901 | Add view switching logic, SC render |
| Event handlers | 903-927 | Add view toggle, SC controls |

## Verification

1. Create/open a dochádzka file
2. Mark several consecutive days as SC
3. Switch to SC Dokumenty view
4. Verify SC block is detected and displayed
5. Fill in SC config (destination, purpose)
6. Set trip times
7. Print preview - verify both documents render correctly
8. Verify data saves to JSON file
9. Reload - verify SC config persists

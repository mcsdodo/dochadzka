# Implementation Plan: Vacation Request Feature

## Overview
Add "Dovolenky" (vacation requests) feature that auto-detects continuous vacation blocks from calendar "D" days and generates "žiadosť o dovolenku" documents. Mirrors the business trips (SC) implementation pattern.

## Key Requirements
- Detect continuous "D" blocks where weekends/holidays DON'T break continuity
- Count only working days (exclude weekends and holidays)
- Generate simplified document with mandatory fields only
- Support manual override of working days count
- Add dedicated "Dovolenky" tab with list, controls, and document rendering

## Files to Create

### 1. `js/vacations.js`
Core vacation logic module (similar to `trips.js`)

**Functions:**
```javascript
findVacationBlocks(monthData, monthKey)
  // Find "D" days and group into continuous blocks
  // Continuity: weekends/holidays between "D" days don't break the block
  // Working days between "D" days DO break the block
  // Return: [{ startDay, endDay }, ...]

syncVacations(monthData, monthKey)
  // Get detected blocks, existing vacations, find uncovered days
  // Create vacation objects for uncovered blocks
  // Object: { id, startDay, endDay, confirmed, workingDaysOverride, requestDate }
  // Return: updated vacations array

calculateWorkingDays(startDay, endDay, monthKey)
  // Count days in range excluding weekends (isWeekendDay) and holidays (isHolidayDay)
  // Return: working days count
```

**Critical Algorithm - Block Detection:**
```javascript
// NOTE: monthKey parameter is required for isWeekendDay/isHolidayDay calls
findVacationBlocks(monthData, monthKey) {
  // Step 1: Get all "D" days, EXCLUDING those on weekends/holidays
  // (D marks on weekends/holidays are ignored - they don't count as vacation)
  const validDDays = Object.keys(monthData.days || {})
    .filter(dayKey => {
      if (monthData.days[dayKey] !== 'D') return false;
      // Skip D marks on weekends or holidays - not valid vacation days
      if (isWeekendDay(monthKey, dayKey)) return false;
      if (isHolidayDay(monthKey, dayKey)) return false;
      return true;
    })
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Step 2: For each consecutive pair of valid D days:
  //   - Check all days between them
  //   - If ANY day is a working day (not weekend, not holiday, not "D") → break block
  //   - Otherwise → extend current block
}
```

### 2. `js/vacation-document.js`
Document rendering module

**Function:**
```javascript
renderVacationRequest(vacation, monthKey, config)
  // Simplified format (no table section):
  // - Header: "DOVOLENKA"
  // - Employee name
  // - Request text with year
  // - Date range with working days count
  // - Request date and signature
```

## Files to Modify

### 3. `js/state.js`
Add: `selectedVacationIndex: 0` to state object

Data structure in JSON file:
```json
"months": {
  "01-2026": {
    "days": { ... },
    "trips": [ ... ],
    "vacations": [
      {
        "id": "v-01-05-01-2026",
        "startDay": "01",
        "endDay": "05",
        "confirmed": false,
        "workingDaysOverride": null,
        "requestDate": "01.01.2026"
      }
    ]
  }
}
```

**Note:** Vacation IDs use `v-` prefix to prevent collision with trip IDs (e.g., `v-01-05-01-2026` vs `01-05-01-2026`).

### 4. `js/router.js`
**Update:**
- `parseHash()`: Add `'dovolenky'` view, extract `vacationId` from hash
- `buildHash()`: Support `#dovolenky/month/vacationId` format
- `setStateFromHash()`: Set `selectedVacationIndex` from `vacationId`
- `updateHash()`: Include vacation ID in hash for confirmed vacations

**Complete parseHash() implementation:**
```javascript
export function parseHash() {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  let view = 'dochadzka';
  if (parts[0] === 'sluzobne-cesty') view = 'sc';
  else if (parts[0] === 'dovolenky') view = 'vacations';
  
  return {
    view,
    month: parts[1] || null,
    tripId: view === 'sc' ? (parts[2] || null) : null,
    vacationId: view === 'vacations' ? (parts[2] || null) : null
  };
}
```

**Complete buildHash() implementation:**
```javascript
export function buildHash(view, month, tripId, vacationId) {
  let viewPart = 'dochadzka';
  if (view === 'sc') viewPart = 'sluzobne-cesty';
  else if (view === 'vacations') viewPart = 'dovolenky';
  
  let hash = `#${viewPart}`;
  if (month) hash += `/${month}`;
  if (tripId && view === 'sc') hash += `/${tripId}`;
  if (vacationId && view === 'vacations') hash += `/${vacationId}`;
  return hash;
}
```

### 5. `js/elements.js`
**Add references:**
```javascript
tabVacations: document.getElementById('tabVacations'),
vacationsView: document.getElementById('vacationsView'),
vacationList: document.getElementById('vacationList'),
vacationControls: document.getElementById('vacationControls'),
vacationStartDay: document.getElementById('vacationStartDay'),
vacationEndDay: document.getElementById('vacationEndDay'),
vacationWorkingDays: document.getElementById('vacationWorkingDays'),
vacationDocuments: document.getElementById('vacationDocuments'),
vacationRequest: document.getElementById('vacationRequest'),
```

### 6. `js/main.js`
**Add imports:**
```javascript
import { syncVacations, calculateWorkingDays } from './vacations.js';
import { renderVacationRequest } from './vacation-document.js';
```

**Add function:**
```javascript
renderVacationsView()
  // Similar to renderSCView()
  // Auto-sync vacations
  // Render vacation list (unconfirmed yellow border, confirmed green)
  // Show controls for confirmed vacations
  // Render document for selected confirmed vacation
  // Calculate working days (use override if set, otherwise calculate)
```

**Update `render()` function:**
```javascript
// Add visibility toggles for all views (alongside existing dochadzka/sc toggles)
elements.vacationsView.classList.toggle('hidden', !hasData || state.currentView !== 'vacations');
elements.tabVacations.classList.toggle('active', state.currentView === 'vacations');

// Also update existing toggles to hide when vacations view is active:
elements.dochadzkaView.classList.toggle('hidden', !hasData || state.currentView !== 'dochadzka');
elements.scView.classList.toggle('hidden', !hasData || state.currentView !== 'sc');

if (state.currentView === 'vacations') {
  renderVacationsView();
  updateHash();
  return;
}
```

**Add event listeners in `init()`:**
- Tab click: Set `currentView = 'vacations'`, render
- List clicks: Confirm/delete/select vacation
- Controls changes: Update vacation dates and working days override

**Working Days Override Input Behavior:**
```javascript
// Empty input → set workingDaysOverride to null (use calculated value)
// Valid number → set workingDaysOverride to that value
// Validation: min=1, max=(endDay - startDay + 1) or calculated working days
elements.vacationWorkingDays.addEventListener('input', () => {
  const value = elements.vacationWorkingDays.value.trim();
  const vacation = getSelectedVacation();
  if (!vacation) return;
  
  if (value === '') {
    vacation.workingDaysOverride = null; // Use calculated
  } else {
    const num = parseInt(value, 10);
    if (num >= 1) {
      vacation.workingDaysOverride = num;
    }
  }
  scheduleSave();
  render();
});
```

### 7. `js/storage.js`
**Update `normalizeData()`:**
```javascript
Object.keys(months).forEach(key => {
  if (!months[key].trips) months[key].trips = [];
  if (!months[key].vacations) months[key].vacations = []; // ADD
});
```

### 8. `index.html`
**Add vacation tab (after tabSC, line ~17):**
```html
<!-- Tab order: Dochádzka → Služobné cesty → Dovolenky -->
<button id="tabVacations">Dovolenky</button>
```

**Add vacation view section (after scView ~102):**
```html
<div id="vacationsView" class="vacations-view hidden">
  <div id="vacationList" class="vacation-list"></div>

  <div id="vacationControls" class="vacation-controls hidden">
    <label>Od: <input type="number" id="vacationStartDay" min="1" max="31" style="width:50px" /></label>
    <label>Do: <input type="number" id="vacationEndDay" min="1" max="31" style="width:50px" /></label>
    <label>Pracovných dní: <input type="number" id="vacationWorkingDays" min="1" style="width:50px" /></label>
  </div>

  <div id="vacationDocuments" class="hidden">
    <div id="vacationRequest" class="document-container"></div>
  </div>
</div>
```

### 9. `styles.css`
**Add vacation view styles:**
- `.vacations-view`, `.vacation-list`, `.vacation-item` (similar to trip styles)
- `.vacation-confirmed` (green border, clickable), `.vacation-unconfirmed` (yellow border)
- `.vacation-selected` (green background)
- `.vacation-controls` (form inputs layout)
- `.vacation-doc`, `.vacation-title-bar`, `.vacation-content` (document styles)
- `.vacation-field`, `.vacation-label`, `.vacation-value` (form fields)
- `.vacation-signature`, `.vacation-sig-date`, `.vacation-sig-label` (signature area)
- Print styles: hide list/controls, show document

**Print Media Query:**
```css
@media print {
  .vacation-list,
  .vacation-controls { display: none !important; }
  .vacation-doc { page-break-inside: avoid; }
  #vacationDocuments { display: block !important; }
}
```

## Implementation Steps

### Phase 1: Core Logic
1. Create `js/vacations.js` with block detection algorithm
2. Implement `findVacationBlocks()` accounting for weekends/holidays
3. Implement `syncVacations()` following `syncTrips()` pattern
4. Implement `calculateWorkingDays()` using `isWeekendDay()`/`isHolidayDay()`

### Phase 2: Document Rendering
1. Create `js/vacation-document.js`
2. Implement `renderVacationRequest()` with simplified format
3. Match Slovak document style (bordered box, dotted lines, signature area)

### Phase 3: State & Routing
1. Update `js/state.js` with `selectedVacationIndex`
2. Update `js/router.js` for `#dovolenky` routing
3. Update `js/storage.js` to normalize `vacations` array

### Phase 4: UI Elements
1. Add vacation elements to `js/elements.js`
2. Update `index.html` with vacation tab and view structure
3. Add vacation styles to `styles.css`

### Phase 5: Integration
1. Update `js/main.js`:
   - Import vacation modules
   - Add `renderVacationsView()` function
   - Update main `render()` to handle vacation view
   - Add tab click event listener
   - Add vacation list event listeners (confirm/delete/select)
   - Add vacation controls event listeners (dates/working days)

### Phase 6: Testing
1. Test vacation block detection with various scenarios
2. Test working days calculation
3. Test confirmation workflow
4. Test document rendering
5. Test URL routing
6. Test printing

## Critical Algorithms

### Vacation Block Detection
```javascript
// Key insight: Check ALL days between consecutive "D" days
// If any day in between is a working day (not weekend, not holiday) → break block

for (let d = previousDay + 1; d < currentDay; d++) {
  const dayKey = String(d).padStart(2, '0');
  if (isWeekendDay(monthKey, dayKey)) continue; // OK, doesn't break
  if (isHolidayDay(monthKey, dayKey)) continue; // OK, doesn't break
  // If we reach here, it's a working day → breaks continuity
  continuous = false;
  break;
}
```

### Working Days Calculation
```javascript
for (let day = start; day <= end; day++) {
  const dayKey = String(day).padStart(2, '0');
  if (isWeekendDay(monthKey, dayKey)) continue;
  if (isHolidayDay(monthKey, dayKey)) continue;
  count++; // It's a working day
}
```

## Document Format
Simplified version with mandatory fields only:

**Year Handling:** Use the year from `monthKey` for the calendar year in the document.
For example, vacation in `12-2025` shows "kalendárny rok 2025".

```
              DOVOLENKA
┌──────────────────────────────────────────────┐
│ Priezvisko a meno, titul: Jozef Mrkvička     │
│                                               │
│ žiada o dovolenku na zotavenie za            │
│ kalendárny rok 2025                           │
│                                               │
│ od 15.12.2025 do 31.12.2025 vrátane,         │
│ t. j. 10 pracovných dní.                      │
│                                               │
│ 1.12.2025          [signature]                │
│ Dátum              Podpis zamestnanca         │
└──────────────────────────────────────────────┘
```

## Verification Steps

1. **Block Detection:**
   - Mark: D-D-D → verify ONE block (3 working days)
   - Mark: D-D-Weekend-D-D → verify ONE block (4 working days)
   - Mark: D-D-Holiday-D → verify ONE block (3 working days)
   - Mark: D-D-8-D → verify TWO blocks (2 + 1 working days)

2. **Working Days Calculation:**
   - D block over weekend → count only weekdays
   - D block over holiday → exclude holiday from count
   - Verify count matches calendar markings

3. **Workflow:**
   - Unconfirmed vacation shows yellow border, no document
   - Confirm vacation → green border, document renders
   - Edit dates → vacation syncs, blocks may split/merge
   - Override working days → custom count persists
   - Delete vacation with "D" days → regenerates on sync

4. **Document:**
   - Shows correct employee name from config
   - Shows correct date range
   - Shows correct working days count (override or calculated)
   - Shows request date
   - Shows signature if available
   - Prints correctly (hides list/controls)

5. **Routing:**
   - URL format: `#dovolenky/01-2026/v-01-05-01-2026` (note `v-` prefix)
   - Direct link loads correct vacation
   - Tab switching updates URL
   - Browser back/forward works
   - Verify vacation ID doesn't conflict with trip IDs

## Critical Files Reference
- `C:\_dev\dochadzka\js\vacations.js` (NEW)
- `C:\_dev\dochadzka\js\vacation-document.js` (NEW)
- `C:\_dev\dochadzka\js\main.js` (lines 142-197 for SC pattern reference)
- `C:\_dev\dochadzka\js\trips.js` (lines 3-77 for pattern reference)
- `C:\_dev\dochadzka\js\utils.js` (lines 60-76 for weekend/holiday helpers)
- `C:\_dev\dochadzka\js\router.js` (entire file for routing pattern)
- `C:\_dev\dochadzka\index.html` (lines 87-102 for SC view structure)

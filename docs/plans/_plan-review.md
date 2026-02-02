# Plan Review: Vacation Request Feature

**Plan File:** `docs/plans/2026-02-02-VACATION_PLAN.md`  
**Review Date:** 2026-02-02  
**Status:** Ready ✅

---

## Summary

| Category | Count | Addressed |
|----------|-------|-----------|
| Critical | 2 | 2 ✅ |
| Important | 4 | 4 ✅ |
| Minor | 3 | 3 ✅ |

**Recommendation:** Ready for implementation - all findings addressed.

---

## Critical Findings

### [x] C1: Block Detection Algorithm Has Logic Gap
**Location:** Phase 1 - `findVacationBlocks()` description  
**Issue:** The plan describes detecting continuous "D" blocks where weekends/holidays don't break continuity. However, the algorithm pseudocode only checks days *between* consecutive "D" days, but doesn't verify that the "D" days themselves are valid (not weekends/holidays that might be marked "D" incorrectly).

**Impact:** Edge case: If someone marks a weekend as "D" (which is unusual but possible), the algorithm may count it as a vacation day when it shouldn't be counted.

**Fix:** Add explicit check: when iterating "D" days, skip those that fall on weekends/holidays since they shouldn't count as vacation days, or clarify in the plan that "D" marks on weekends are ignored.

**Resolution:** ✅ Added explicit filtering in algorithm to skip "D" marks on weekends/holidays.

---

### [x] C2: Missing `monthKey` Parameter in `findVacationBlocks()`
**Location:** Phase 1 - Function signature  
**Issue:** The function signature shows `findVacationBlocks(monthData, monthKey)` but the algorithm description doesn't use `monthKey` for weekend/holiday detection. The pseudocode references `isWeekendDay(monthKey, dayKey)` and `isHolidayDay(monthKey, dayKey)` but the function parameter list doesn't clearly show monthKey being passed through.

**Impact:** Implementation may fail due to missing parameter or incorrect usage.

**Fix:** Ensure function signature and usage are consistent: `findVacationBlocks(monthData, monthKey)` and verify all helper calls receive `monthKey`.

**Resolution:** ✅ Added NOTE in algorithm that monthKey is required; showed explicit usage in code.

---

## Important Findings

### [x] I1: Vacation ID Format Inconsistency with Trips
**Location:** Data structure section  
**Issue:** Vacation ID format is `"01-05-01-2026"` (startDay-endDay-monthKey) while trip ID format in existing code is `${startDay}-${endDay}-${monthKey}`. Both look identical, but the plan shows `"01-05-01-2026"` which appears to be `day-day-month-year` but could be confused with `month-day-day-year`.

**Impact:** Potential URL routing conflicts if vacation and trip IDs can overlap (e.g., vacation on days 01-05 in 01-2026 vs trip on same days).

**Fix:** Consider prefixing vacation IDs with `v-` (e.g., `v-01-05-01-2026`) or clarify the ID format to prevent collisions when both views share routing logic.

**Resolution:** ✅ Added `v-` prefix to vacation IDs throughout the plan.

---

### [x] I2: Missing View Toggle Logic in `render()` Function
**Location:** Phase 5 - main.js modifications  
**Issue:** The plan shows adding a condition for `state.currentView === 'vacations'` but doesn't show how to hide the dochadzka and SC views when vacation view is active. Current `render()` function toggles visibility based on `'dochadzka'` and `'sc'` views only.

**Impact:** Multiple views may be visible simultaneously, or views may not hide properly.

**Fix:** Add explicit visibility toggles in `render()`:
```javascript
elements.vacationsView.classList.toggle('hidden', !hasData || state.currentView !== 'vacations');
elements.tabVacations.classList.toggle('active', state.currentView === 'vacations');
```

**Resolution:** ✅ Added complete visibility toggle logic for all three views.

---

### [x] I3: Missing `workingDaysOverride` Input Behavior
**Location:** Phase 5 - Event listeners  
**Issue:** Plan mentions "Controls changes: Update vacation dates and working days override" but doesn't specify:
1. When is `workingDaysOverride` set vs null?
2. Should clearing the input reset to calculated value?
3. What's the minimum/maximum value validation?

**Impact:** Unclear implementation behavior leading to bugs.

**Fix:** Specify:
- Empty input = `null` (use calculated value)
- Valid number input = set `workingDaysOverride` to that value
- Validation: min=1, max=(endDay - startDay + 1)

**Resolution:** ✅ Added complete event listener implementation with validation logic.

---

### [x] I4: Router Hash Format Ambiguity
**Location:** Phase 3 - router.js modifications  
**Issue:** Plan shows URL format `#dovolenky/01-2026/01-05-01-2026` but existing router uses `#sluzobne-cesty` for SC view. The plan uses Slovak word "dovolenky" which is good for consistency, but `parseHash()` update description is incomplete.

**Impact:** Router may not correctly parse vacation URLs.

**Fix:** Complete the router update specification:
```javascript
parseHash(): {
  view: parts[0] === 'sluzobne-cesty' ? 'sc' : 
        parts[0] === 'dovolenky' ? 'vacations' : 'dochadzka',
  month: parts[1] || null,
  tripId: parts[2] || null,
  vacationId: parts[2] || null  // Same slot, different semantic
}
```

**Resolution:** ✅ Added complete parseHash() and buildHash() implementations.

---

## Minor Findings

### [x] M1: Document Year Handling Edge Case
**Location:** Document Format section  
**Issue:** The example shows "kalendárny rok 2026" but vacations can span year boundaries (e.g., December vacation carrying into January). The plan doesn't specify how `requestDate` year is determined.

**Impact:** Cosmetic issue on document, but could be confusing.

**Fix:** Clarify: Use the year from `monthKey` for the calendar year in the document, or the year of the first day of vacation.

**Resolution:** ✅ Added explicit year handling note: use year from monthKey.

---

### [x] M2: Missing CSS Print Media Query Details
**Location:** Phase 4 - styles.css  
**Issue:** Plan mentions "Print styles: hide list/controls, show document" but doesn't specify the CSS selectors or media query structure.

**Impact:** May miss print styling during implementation.

**Fix:** Add specific print style requirements:
```css
@media print {
  .vacation-list, .vacation-controls { display: none !important; }
  .vacation-doc { page-break-inside: avoid; }
}
```

**Resolution:** ✅ Added complete print media query CSS block.

---

### [x] M3: Tab Order in HTML
**Location:** Phase 4 - index.html  
**Issue:** Plan shows adding `<button id="tabVacations">Dovolenky</button>` at "line ~17" but doesn't specify exact placement relative to existing tabs.

**Impact:** Minor - tab order may not be intuitive.

**Fix:** Specify: Add after `tabSC` to maintain logical order: Dochádzka → Služobné cesty → Dovolenky.

**Resolution:** ✅ Added explicit placement note and comment.

---

## Verification Checklist

The plan includes good verification steps. Additional items to verify:

- [ ] Test vacation spanning month boundary (if supported) or verify it's explicitly not supported
- [ ] Test with empty calendar (no "D" days) - should show "Žiadne dovolenky" message
- [ ] Test delete then re-add "D" days - vacation should regenerate
- [ ] Test concurrent edits to dates in controls vs calendar view

---

## Completeness Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Requirements covered | ✓ | All key requirements addressed |
| Edge cases | ⚠ | Some edge cases need clarification (C1, M1) |
| File paths specified | ✓ | All files listed with line references |
| Verification steps | ✓ | Comprehensive test scenarios |
| Dependencies clear | ✓ | Follows existing SC pattern |
| Implementation order | ✓ | Logical phased approach |

---

## Feasibility Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Technical approach | ✓ | Mirrors proven SC implementation |
| Complexity | ✓ | Reasonable, well-scoped |
| Hidden dependencies | ⚠ | Router changes affect all views |
| Time estimate | ✓ | Phased approach is realistic |

---

## Next Steps

All findings have been addressed. Plan is ready for implementation.

---

## Resolution Summary

| Finding | Status |
|---------|--------|
| C1 - Block Detection Logic | ✅ Added weekend/holiday filtering |
| C2 - Missing monthKey | ✅ Added explicit usage note |
| I1 - ID Collision | ✅ Added `v-` prefix |
| I2 - View Toggle | ✅ Added complete toggle logic |
| I3 - Input Behavior | ✅ Added event listener spec |
| I4 - Router Format | ✅ Added complete implementations |
| M1 - Year Handling | ✅ Added clarification |
| M2 - Print CSS | ✅ Added media query |
| M3 - Tab Order | ✅ Added placement note |

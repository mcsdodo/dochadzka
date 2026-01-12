# SC Documents Integration - Detailed Design

## Overview

Integrate "Cestovný príkaz" and "Vyúčtovanie" document generation into the dochádzka app for consecutive SC (Služobná cesta) days. Documents must match the Excel template exactly (1:1 reproduction).

## Data Model

### scConfig (in JSON file, user edits manually)

```json
"scConfig": {
  "address": "Horná 123, 010 01 Žilina",
  "destination": "Praha, Česká republika",
  "purpose": "Obchodné rokovanie",
  "vehicleType": "osobné motorové vozidlo",
  "licensePlate": "ZA-123AB",
  "defaultKm": 370,
  "defaultStartTime": "04:30",
  "perDiem": {
    "rate5to12": 7.80,
    "rate12to18": 11.60,
    "rateOver18": 17.40
  }
}
```

### Trip data (in month object, managed by app)

```json
"months": {
  "01-2026": {
    "days": { "06": "SC", "07": "SC", "08": "SC", "09": "SC" },
    "trips": [
      {
        "id": "06-09-01-2026",
        "startDay": "06",
        "endDay": "09",
        "confirmed": true,
        "startTime": "04:30",
        "endTime": "18:00",
        "km": 370
      }
    ]
  }
}
```

### Field descriptions

| Field | Description |
|-------|-------------|
| `id` | Trip identifier: startDay-endDay-month-year (e.g., "06-09-01-2026") |
| `startDay`, `endDay` | First and last day of SC block |
| `confirmed` | `false` = auto-detected, awaiting confirmation; `true` = confirmed, editable |
| `startTime` | Departure time on first day (default from scConfig.defaultStartTime) |
| `endTime` | Return time on last day (user enters) |
| `km` | Distance traveled (default from scConfig.defaultKm) |

## UI Structure

### Topbar changes

```
[Dochádzka] [Služobné cesty] | [Vytvoriť] [Otvoriť] [Pripojiť] [Nahrať podpis] [Tlačiť] [Upraviť]
```

- View tabs on left (always visible when file loaded)
- Active tab highlighted
- Existing buttons remain on right

### Dochádzka view (existing)

No changes. Print outputs attendance table.

### Služobné cesty view

```
◀ [06-09-01-2026] ▶    (trip navigation)

┌─ Detected trips in 01-2026: ─────────────────┐
│ 06.01 - 09.01 (4 dni)  [Potvrdiť]           │  ← unconfirmed
│ 20.01 - 22.01 (3 dni)  ✓ potvrdené          │  ← confirmed
└──────────────────────────────────────────────┘

(When viewing confirmed trip:)

Odchod: [04:30]  Príchod: [18:00]  KM: [370]

┌─ CESTOVNÝ PRÍKAZ ────────────────────────────┐
│ (document matching Excel layout exactly)     │
└──────────────────────────────────────────────┘

┌─ VYÚČTOVANIE ────────────────────────────────┐
│ (document matching Excel layout exactly)     │
└──────────────────────────────────────────────┘
```

## Document Templates

### Cestovný príkaz

Must match Excel layout exactly. Contains:

**Header:**
- Title: "CESTOVNÝ PRÍKAZ" (centered, bold)
- Company: `config.employerName`
- Employee: `config.employeeName`
- Address: `scConfig.address`

**Journey details:**
- Departure: first day + `startTime`
- Return: last day + `endTime`
- Destination: `scConfig.destination`
- Purpose: `scConfig.purpose`

**Vehicle:**
- Type: `scConfig.vehicleType`
- License plate: `scConfig.licensePlate`

**Signature:**
- Date: first day of month
- Image: `config.signaturePng` (reused from dochádzka)
- Second signature line: last day of month

### Vyúčtovanie

Must match Excel layout exactly. Contains:

**Header:**
- Title: "VYÚČTOVANIE PRACOVNEJ CESTY"
- Employee, company info
- Trip identifier

**Per-day table:**

| Dátum | AUS | KM | Čas od | Čas do | Hodiny | Stravné |
|-------|-----|-----|--------|--------|--------|---------|
| 06.01 | AUS | 370 | 04:30 | 23:59 | 19:29 | 17.40 € |
| 07.01 | - | - | 00:00 | 23:59 | 23:59 | 17.40 € |
| 08.01 | - | - | 00:00 | 23:59 | 23:59 | 17.40 € |
| 09.01 | AUS | 370 | 00:00 | 18:00 | 18:00 | 17.40 € |

**Rules:**
- First day: AUS + KM, starts at `startTime`, ends 23:59
- Middle days: no AUS/KM, 00:00-23:59
- Last day: AUS + KM, starts 00:00, ends at `endTime`
- Per diem rates from `scConfig.perDiem`:
  - 5-12 hours: rate5to12
  - 12-18 hours: rate12to18
  - >18 hours: rateOver18

**Totals:**
- Total KM
- Total stravné

**Signature:**
- Date: last day of month
- Image: `config.signaturePng`

## Logic & Behavior

### SC Block Detection

```javascript
function findSCBlocks(monthKey) {
  // Returns: [{startDay: "06", endDay: "09"}, ...]
  // Scans days object for consecutive "SC" values
}
```

### Trip Synchronization

1. Compare detected blocks with existing `trips[]`
2. New blocks → add unconfirmed trip record
3. Removed SC days → warn user (don't auto-delete)
4. User confirms → set `confirmed: true`, populate defaults

### View Switching

- `state.currentView`: `'dochadzka'` | `'sc'`
- Tab click switches view
- Both views share file handle, auto-save

### Trip Navigation

- `state.selectedTripIndex` tracks current trip
- ◀ ▶ buttons cycle through confirmed trips
- Similar to month navigation

### Print Behavior

- Dochádzka view: prints attendance table
- SC view: prints Cestovný príkaz + Vyúčtovanie
- Page break between documents (CSS `@media print`)
- Two A4 pages

## Implementation Order

1. **Data model** - Add `defaultScConfig`, normalize `scConfig` and `trips[]`
2. **SC detection** - `findSCBlocks()` function
3. **View switcher** - Tab buttons, `currentView` state
4. **SC view HTML** - Container, trip list, navigation
5. **Trip confirmation** - Detect → confirm → edit flow
6. **Document templates** - Match Excel exactly
7. **Print styling** - Two-page A4 with page break
8. **Event handlers** - Wire everything up

## Testing Checklist

- [ ] Load file with SC days → trips auto-detected
- [ ] Confirm trip → times become editable
- [ ] Edit times → values persist (auto-save in test mode updates localStorage)
- [ ] Switch views → correct content shown
- [ ] Navigate trips → prev/next works
- [ ] Print from SC view → two A4 pages
- [ ] Reload → trips and times persist
- [ ] Documents match Excel layout exactly

## Files Modified

- `index.html` - All changes (single-file app)

## Key Code Locations

| Section | Approximate Line | Change |
|---------|------------------|--------|
| CSS | ~8-220 | View tabs, SC styles, print styling |
| HTML | ~220-290 | View containers, SC view structure |
| State | ~304-315 | Add `currentView`, trip state |
| Defaults | ~320-330 | Add `defaultScConfig` |
| SC detection | ~490 | New `findSCBlocks()` |
| Normalize | ~486-491 | Handle `scConfig`, `trips` |
| Render | ~770-900 | View switching, SC render |
| Events | ~925-950 | View tabs, trip controls |

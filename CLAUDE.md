# Dochádzka

Employee attendance and business trip management application.

## Tech Stack

- HTML + CSS + JavaScript (ES modules)
- No build process - just serve and open in browser
- Uses File System Access API for local JSON file storage
- Slovak language UI

## Development

```bash
npx live-server
```

This starts a dev server with auto-refresh at `http://localhost:8080`.

Alternative (no auto-refresh):
```bash
python -m http.server 8000
```

## Project Structure

```
js/
  state.js      - State object and default configurations
  elements.js   - DOM element references
  router.js     - URL hash routing (#view/month/tripId)
  utils.js      - Date helpers, holidays, formatters
  storage.js    - File System API, IndexedDB, save/load
  trips.js      - Business trip logic (SC blocks, sync)
  documents.js  - Cestovný príkaz & Vyúčtovanie rendering
  settings.js   - Settings view: edit config/scConfig, list discrepancies
  main.js       - Init, event listeners, render functions
styles.css      - All styling
index.html      - HTML structure
```

## Architecture

### Data Storage
- JSON file selected by user via File System Access API
- Structure: `{ config, scConfig, months: { "MM-YYYY": { days, trips } } }`
- `normalizeData()` merges defaults under the file values, so the file always wins.
  A change to a default in [js/state.js](./js/state.js) does not reach an existing file. Edit such
  values in the Nastavenia view.

### URL Routing
- Format: `#view/month/tripId`
- Examples: `#dochadzka/01-2026`, `#sluzobne-cesty/01-2026/26-27-01-2026`, `#nastavenia`

### Views
1. **Dochádzka** - Monthly attendance calendar with day types
2. **Služobné cesty (SC)** - Business trip management with auto-generated documents
3. **Dovolenky** - Vacation requests and yearly balance
4. **Nastavenia** - Edit file values that have no other UI, and list discrepancies
   (placeholder values, obsolete or unknown fields, default times that do not give 8 h).
   Read-only until "Upraviť". Edits go to `state.settingsDraft` (in memory only, so a
   refresh discards them). "Uložiť" shows a dialog with each change (old -> new); only
   "Uložiť do súboru" copies the draft into `state.data` and writes the file.

### Key Modules
- `utils.js` - `generateMonth()`, `getSlovakHolidays()`, date parsing
- `trips.js` - `findSCBlocks()`, `syncTrips()`
- `documents.js` - `renderCestovnyPrikaz()`, `renderVyuctovanie()`
- `storage.js` - `saveData()`, `loadFromHandle()`, `scheduleSave()`

### Day Types
- `8` - Full day (8 hours)
- `D` - Dovolenka (vacation)
- `S` - Sviatok (holiday)
- `SC` - Služobná cesta (business trip)
- `PN` - Práceneschopnosť (sick leave)
- `0` - Weekend/no work
- Custom hours (e.g., `4`, `6`)

## Notes

- Per diem (stravné) rates change every year. They live in the file as `scConfig.perDiemRates`,
  one row per first valid month (`from: 'YYYY-MM'`, `''` = no start limit), editable in Nastavenia.
  `getPerDiemRates(monthKey, table)` picks the row for the trip month, so old trips keep old rates.
  `defaultPerDiemRates` in [js/state.js](./js/state.js) seeds files without a table; Nastavenia
  reports default rows that the file lacks or that differ. Add each new year's rates there too.
  `scConfig.perDiem` (3 numbers) in old files is obsolete; Nastavenia offers to remove it.
- Business trips are auto-created when SC days are marked in calendar
- Deleted trips will regenerate if SC days still exist in calendar
- Edit trip dates to split consecutive SC days into multiple trips
- Documents styled to match Slovak official formats

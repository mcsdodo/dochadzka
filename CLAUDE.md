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
  main.js       - Init, event listeners, render functions
styles.css      - All styling
index.html      - HTML structure
```

## Architecture

### Data Storage
- JSON file selected by user via File System Access API
- Structure: `{ config, scConfig, months: { "MM-YYYY": { days, trips } } }`

### URL Routing
- Format: `#view/month/tripId`
- Examples: `#dochadzka/01-2026`, `#sluzobne-cesty/01-2026/26-27-01-2026`

### Views
1. **Dochádzka** - Monthly attendance calendar with day types
2. **Služobné cesty (SC)** - Business trip management with auto-generated documents

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

- Business trips are auto-created when SC days are marked in calendar
- Deleted trips will regenerate if SC days still exist in calendar
- Edit trip dates to split consecutive SC days into multiple trips
- Documents styled to match Slovak official formats

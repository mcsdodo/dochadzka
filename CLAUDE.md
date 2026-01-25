# Dochádzka

Employee attendance and business trip management application.

## Tech Stack

- Single-file HTML application (`index.html`) with embedded CSS and JavaScript
- No build process - just serve and open in browser
- Uses File System Access API for local JSON file storage
- Slovak language UI

## Development

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`

## Architecture

### Data Storage
- JSON file selected by user via File System Access API
- Structure: `{ config, scConfig, months: { "MM-YYYY": { days, trips } } }`

### Views
1. **Dochádzka** - Monthly attendance calendar with day types (work hours, vacation, sick leave, etc.)
2. **Služobné cesty (SC)** - Business trip management with auto-generated documents

### Key Functions
- `generateMonth()` - Creates month structure with days
- `findSCBlocks()` - Detects consecutive SC days in calendar
- `syncTrips()` - Syncs trips with detected SC blocks
- `renderCestovnyPrikaz()` / `renderVyuctovanie()` - Render travel documents

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
- Documents styled to match Slovak official formats

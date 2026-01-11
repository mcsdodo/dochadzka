# Dochádzka App - Design Document

## Overview

A simple table-editor web app for generating Slovak "dochádzka" (attendance/timesheet) documents. Hosted on GitHub Pages, no backend. Outputs printable PDF via browser print.

**UI language:** Slovak

## Data Model

### JSON file structure

```json
{
  "config": {
    "employeeName": "Jozef Lačný",
    "employerName": "Techlab s.r.o.",
    "defaultTimes": {
      "arrival": "08:00",
      "breakStart": "11:30",
      "breakEnd": "12:00",
      "departure": "16:30"
    },
    "signaturePng": "data:image/png;base64,..."
  },
  "months": {
    "01-2026": {
      "days": {
        "01": "0",
        "02": "D",
        "03": "8"
      }
    }
  }
}
```

### Day values

| Value | Meaning | Times displayed |
|-------|---------|-----------------|
| `8` | Full work day | Default times from config |
| `0` | Day off (weekend) | `-` |
| `S` | Sviatok (public holiday) | `-` |
| `D` | Dovolenka (vacation) | `-` |
| `PN` | Práceneschopnosť (sick leave) | `-` |
| `O` | OČR (family care) | `-` |
| `SC` | Služobná cesta (business trip) | `-` |
| `IN` | Iná neprítomnosť (other absence) | `-` |

## Storage

### File System Access API with one-click reconnect

1. **First visit** → Show "Create sample file" button prominently. Creates `dochadzka.json` with template config and current month. User edits config (names, times) in text editor.
2. **Open file** → File picker, user selects their JSON. App loads it, stores filename in localStorage.
3. **Return visits** → "Reconnect to `dochadzka.json`" button. One click opens picker, user selects same file.
4. **Auto-save** → Every edit saves to file immediately (debounced 100ms).

### Browser support

- Supported: Chrome, Edge, Opera (File System Access API)
- Unsupported: Firefox, Safari → show message: "Nepodporovaný prehliadač. Použite Chrome alebo Edge."

## UI Layout

Dead simple - just text anchors and a table. No fancy styling.

```
First visit (no file loaded):
─────────────────────────────────────────────────────────
[Vytvoriť súbor]  [Otvoriť súbor]

Nepodporovaný prehliadač. Použite Chrome alebo Edge.
(shown only if File System Access API not available)
─────────────────────────────────────────────────────────

With file loaded:
─────────────────────────────────────────────────────────
[Pripojiť: dochadzka.json]  [Otvoriť]  [Podpis]  [Tlačiť]

◀ 12-2025  [01-2026]  02-2026 ▶  [+ Nový mesiac]

Dochádzka - evidencia pracovného času zamestnanca
za mesiac: 01-2026
zamestnávateľ: Techlab s.r.o.
zamestnanec: Jozef Lačný

Dátum  Príchod  Prestávka       Odchod  Počet hodín
                Odchod Príchod
───────────────────────────────────────────────────
01       -        -       -        -        0
02     08:00    11:30   12:00    16:30      8   ←
03       -        -       -        -        D
...
───────────────────────────────────────────────────
SPOLU                                      104

D - dovolenka, S - sviatok, SC - služobná cesta,
PN - práceneschopnosť, O - OČR, IN - iná neprítomnosť
Prestávka* - §91 Zákonníka práce

Podpis: [signature image]
─────────────────────────────────────────────────────────
```

## Keyboard Navigation

### Focus
- On page load with data, focus on first day's "Počet hodín" cell
- Visible border/outline on focused cell

### Navigation
- `↑` / `↓` → move between days (wrap at month boundaries)
- No left/right navigation

### Value entry (keypress)

| Key | Sets value | Notes |
|-----|------------|-------|
| `8` | `8` | |
| `0` | `0` | |
| `D` | `D` | |
| `P` | `PN` | |
| `O` | `O` | |
| `S` | `S` | Sviatok |
| `S` then `C` | `SC` | If current value is `S`, typing `C` changes it to `SC` (služobná cesta) |
| `I` | `IN` | |

## Month Generation

**"+ New month" button behavior:**
- If no months exist → creates current month (MM-YYYY)
- If months exist → creates latest month + 1

**When generating a new month:**

1. Determine days in month (28-31)
2. For each day:
   - Saturday/Sunday → `0`
   - Slovak public holiday → `S`
   - Otherwise → `8`

### Slovak public holidays

**Fixed dates:**
- 1.1 - Deň vzniku SR
- 6.1 - Traja králi
- 1.5 - Sviatok práce
- 8.5 - Deň víťazstva
- 5.7 - Sv. Cyril a Metod
- 29.8 - SNP
- 1.9 - Deň ústavy
- 1.11 - Všetkých svätých
- 17.11 - Deň boja za slobodu
- 24.12 - Štedrý deň
- 25.12 - 1. sviatok vianočný
- 26.12 - 2. sviatok vianočný

**Moving dates (calculated from Easter):**
- Veľký piatok (Good Friday) - Easter Sunday - 2
- Veľkonočný pondelok (Easter Monday) - Easter Sunday + 1

## Print Output

### Visible in print
- Title: "Dochádzka - evidencia pracovného času zamestnanca" (dark blue, underlined)
- Header: month, employer, employee
- Table: Dátum, Príchod, Prestávka (Odchod/Príchod), Odchod, Počet hodín
- SPOLU row with total
- Legend (two lines)
- Podpis with signature PNG

### Hidden in print
- Top bar (file buttons, signature button, print button)
- Month navigation
- Cell focus indicator

### Styling
- Black text on white background
- Title in dark blue, underlined
- Minimal table styling
- A4 portrait orientation

## Technical Implementation

### Single HTML file

```
index.html
├── <style> - all CSS including @media print
├── <main> - UI structure
└── <script> - vanilla JS (~300-400 lines)
```

### Key functions

- `createSampleFile()` - creates template JSON with config and current month, prompts user to save
- `openFile()` - File System Access API file picker
- `saveFile()` - write data to file handle (debounced 100ms)
- `uploadSignature()` - opens image file picker, converts to base64, saves to config.signaturePng
- `generateMonth(year, month)` - creates default month data
- `calculateEaster(year)` - returns Easter Sunday date (using Anonymous Gregorian algorithm)
- `getSlovakHolidays(year)` - returns Set of "MM-DD" strings
- `render()` - updates DOM from data
- `handleKeydown(e)` - navigation + value entry
- `calculateTotal()` - sums hours for SPOLU
- `print()` - triggers browser print dialog (window.print())

### Dependencies

None - vanilla HTML/CSS/JS only.

### Deployment

**GitHub repository:**
- Create new public repo: `dochadzka`
- URL: `https://github.com/mcsdodo/dochadzka`

**GitHub Pages deployment via GitHub Action:**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Setup steps:**
1. Create repo on GitHub (public)
2. Enable GitHub Pages in repo settings → Source: GitHub Actions
3. Push code with workflow file
4. Action auto-deploys on every push to master

**Final URL:** `https://mcsdodo.github.io/dochadzka/`

## Implementation Steps

1. Create HTML structure with all UI elements
2. Add CSS styling (screen + print)
3. Implement File System Access API (open/save/reconnect)
4. Implement sample file creation
5. Implement month generation with holiday calculation
6. Implement keyboard navigation and value entry
7. Implement signature PNG upload
8. Implement print styling
9. Test full workflow
10. Create GitHub Action workflow file
11. Create public GitHub repo `dochadzka`
12. Push code and verify deployment

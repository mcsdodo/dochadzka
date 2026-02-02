# Screenshots Generation

This folder contains tools for generating README screenshots for the Dochádzka application.

## Files

- **screenshot-data.json** - Sample data used for screenshots with realistic content
- **take-screenshots.js** - Playwright script that automates screenshot capture
- **screenshot-dochadzka.png** - Attendance view screenshot
- **screenshot-sc.png** - Business trips view screenshot
- **screenshot-dovolenky.png** - Vacations view screenshot

## Prerequisites

```bash
npm install playwright
```

## How to Generate Screenshots

1. **Start the development server:**
   ```bash
   npx live-server
   ```
   Note the port number (e.g., `http://127.0.0.1:55123`)

2. **Update the port in take-screenshots.js:**
   Edit line 18 to match your server port:
   ```javascript
   await page.goto('http://localhost:55123?test');
   ```

3. **Run the screenshot script:**
   ```bash
   cd screenshots
   node take-screenshots.js
   ```

4. **Move screenshots to root:**
   ```bash
   mv screenshot-*.png ../
   ```

## How It Works

The script uses the app's built-in test mode:

1. Loads the app with `?test` query parameter
2. Injects `screenshot-data.json` into `localStorage` as `testData`
3. The app's `loadTestData()` function reads from localStorage
4. Navigates through all three views (Dochádzka, Služobné cesty, Dovolenky)
5. Takes a screenshot of each view

## Customizing Screenshot Data

Edit `screenshot-data.json` to change:
- Employee and employer names
- Month and year
- Day types (8=work, D=vacation, SC=business trip, etc.)
- Business trip details
- Vacation periods

The data follows the same structure as the main `dochadzka.json` file.

## Screenshot Dimensions

- Viewport: 1280 x 900 pixels
- Format: PNG
- Full page: No (captures visible viewport only)

## Troubleshooting

**Port mismatch:**
- Check live-server output for actual port
- Update `take-screenshots.js` line 18

**Browser not launching:**
- Run: `npx playwright install chromium`

**Screenshots are blank:**
- Ensure test data is valid JSON
- Check browser console for errors (script runs in non-headless mode)

## Notes

- Screenshots are taken with `headless: false` so you can watch the process
- Each view gets 500ms to render before screenshot
- The script automatically cleans up browser instance when done

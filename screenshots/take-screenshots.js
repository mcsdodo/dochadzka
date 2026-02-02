// Playwright script to take screenshots for README
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Read the screenshot data
  const dataPath = path.join(__dirname, 'screenshot-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Load the app in test mode
  await page.goto('http://localhost:55123?test');

  // Set test data in localStorage before the page loads
  await page.evaluate((testData) => {
    localStorage.setItem('testData', JSON.stringify(testData));
  }, data);

  // Reload to apply test data
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Screenshot 1: Dochádzka view
  console.log('Taking screenshot 1: Dochádzka view...');
  await page.click('#tabDochadzka');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'screenshot-dochadzka.png',
    fullPage: true
  });

  // Screenshot 2: SC view
  console.log('Taking screenshot 2: Služobné cesty view...');
  await page.click('#tabSC');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'screenshot-sc.png',
    fullPage: true
  });

  // Screenshot 3: Vacations view
  console.log('Taking screenshot 3: Dovolenky view...');
  await page.click('#tabVacations');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'screenshot-dovolenky.png',
    fullPage: true
  });

  console.log('All screenshots taken successfully!');
  await browser.close();
}

takeScreenshots().catch(console.error);

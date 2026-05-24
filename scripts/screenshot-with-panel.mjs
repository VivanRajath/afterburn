import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dir, '..', 'public');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('input[type=text]', { state: 'visible' });
await page.waitForTimeout(1500);

await page.click('button:has-text("Add afterburn")');
const canvas = page.locator('canvas').first();
await canvas.waitFor({ timeout: 15000 });
await page.waitForTimeout(6000);

// Get canvas bounding box
const canvasBox = await canvas.boundingBox();
console.log('Canvas box:', JSON.stringify(canvasBox));

// Try clicking using locator with position (canvas-relative coordinates)
// Scan the lower-right area where the incident cluster tends to settle
let panelOpen = false;
const pairs = [
  [640, 375], [620, 360], [660, 390], [640, 390], [620, 380],
  [600, 370], [680, 380], [640, 350], [660, 360], [600, 390],
  // Also upper area for the orange/blue cluster
  [350, 220], [340, 240], [360, 230], [380, 220], [340, 200],
];

for (const [x, y] of pairs) {
  await canvas.click({ position: { x, y }, force: true });
  await page.waitForTimeout(350);
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('Properties')) {
    console.log(`Node hit at canvas position (${x}, ${y})`);
    panelOpen = true;
    break;
  }
}

console.log('Panel open:', panelOpen);
await page.waitForTimeout(500);
await page.screenshot({ path: join(PUBLIC, 'screenshot-graph.png') });
console.log('Saved screenshot-graph.png');
await browser.close();

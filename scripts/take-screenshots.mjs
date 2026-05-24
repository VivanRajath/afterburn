// take-screenshots.mjs
// Captures two screenshots using Playwright:
//   public/screenshot-graph.png   — graph rendered + node panel open
//   public/screenshot-warning.png — Check result showing band-aid tier

import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dir, '..', 'public');
const BASE = 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

console.log('Navigating…');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
// Wait for React hydration
await page.waitForSelector('input[type=text]', { state: 'visible', timeout: 10000 });
await page.waitForTimeout(1500);

// ── Screenshot 1: graph + side panel ─────────────────────────────────────
console.log('Connecting repo…');
await page.click('button:has-text("Add afterburn")');

// Wait for canvas (ForceGraph2D renders it)
await page.waitForSelector('canvas', { timeout: 15000 });
// Let the force simulation settle
await page.waitForTimeout(3500);

// Click on a node — try centre of canvas first, then offset positions
const canvas = await page.$('canvas');
let panelOpen = false;
if (canvas) {
  const box = await canvas.boundingBox();
  if (box) {
    const tries = [
      [0.5, 0.5],
      [0.45, 0.45],
      [0.55, 0.45],
      [0.5, 0.4],
      [0.4, 0.55],
    ];
    for (const [rx, ry] of tries) {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
      await page.waitForTimeout(600);
      const panel = await page.$('text=Properties');
      if (panel) { panelOpen = true; break; }
    }
  }
}
if (!panelOpen) console.warn('  Could not open node panel — taking screenshot without it');
await page.waitForTimeout(400);

await page.screenshot({ path: join(PUBLIC, 'screenshot-graph.png') });
console.log('  Saved screenshot-graph.png');

// ── Screenshot 2: PR check result ────────────────────────────────────────
// Scroll to AskAfterburn section
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);

console.log('Loading sample diff…');
await page.click('button:has-text("Load sample PR diff")');
await page.waitForTimeout(800);

console.log('Checking PR…');
await page.click('button:has-text("Check")');

try {
  await page.waitForSelector('pre, .border-rose-200', { timeout: 60000 });
  await page.waitForTimeout(500);
} catch {
  console.warn('  Timed out waiting for result — taking screenshot anyway');
}

await page.screenshot({ path: join(PUBLIC, 'screenshot-warning.png') });
console.log('  Saved screenshot-warning.png');

await browser.close();
console.log('Done.');

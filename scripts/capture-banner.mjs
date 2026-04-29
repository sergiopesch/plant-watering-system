import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

const bannerPath = process.env.BANNER_PATH || 'docs/assets/self-contained-smart-pot-banner.jpg';
const productUrl = process.env.BANNER_URL || 'http://localhost:3001/';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/snap/bin/chromium';

await mkdir(dirname(bannerPath), { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 900, width: 1600 },
});

await page.goto(productUrl, { waitUntil: 'networkidle' });
await page.mouse.move(1120, 320);
await page.waitForTimeout(1200);
await page.screenshot({
  fullPage: false,
  path: bannerPath,
  quality: 88,
  type: 'jpeg',
});

await browser.close();

console.log(`Captured ${bannerPath} from ${productUrl}`);

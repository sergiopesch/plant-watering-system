import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';
import { getChromiumExecutablePath, readPositiveIntegerEnv } from './playwright-utils.mjs';

const bannerPath = process.env.BANNER_PATH || 'docs/assets/self-contained-smart-pot-banner.jpg';
const productUrl = process.env.BANNER_URL || 'http://localhost:3001/';
const bannerWidth = readPositiveIntegerEnv('BANNER_WIDTH', 1600);
const bannerHeight = readPositiveIntegerEnv('BANNER_HEIGHT', 900);
const bannerQuality = readPositiveIntegerEnv('BANNER_QUALITY', 88);

await mkdir(dirname(bannerPath), { recursive: true });

const browser = await chromium.launch({
  executablePath: getChromiumExecutablePath(),
  headless: true,
});

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: bannerHeight, width: bannerWidth },
  });

  await page.goto(productUrl, { waitUntil: 'networkidle' });
  await page.mouse.move(bannerWidth * 0.7, bannerHeight * 0.36);
  await page.waitForTimeout(1200);
  await page.screenshot({
    fullPage: false,
    path: bannerPath,
    quality: clampQuality(bannerQuality),
    type: 'jpeg',
  });
} finally {
  await browser.close();
}

console.log(`Captured ${bannerPath} from ${productUrl}`);

function clampQuality(value) {
  return Math.max(1, Math.min(100, value));
}

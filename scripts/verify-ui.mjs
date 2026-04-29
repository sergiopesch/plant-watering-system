import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

const root = process.cwd();
const port = process.env.UI_VERIFY_PORT || '4173';
const baseUrl = `http://127.0.0.1:${port}`;
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function analyzePng(buffer) {
  const png = PNG.sync.read(buffer);
  let colored = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const r = png.data[index];
    const g = png.data[index + 1];
    const b = png.data[index + 2];
    const a = png.data[index + 3];

    if (a > 0 && (Math.abs(r - 247) > 8 || Math.abs(g - 248) > 8 || Math.abs(b - 242) > 8)) {
      colored += 1;
    }
  }

  const total = png.width * png.height;
  return {
    coloredRatio: colored / total,
    height: png.height,
    nonBlank: colored > total * 0.03,
    width: png.width,
  };
}

async function inspectViewport(browser, viewport) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: viewport.width, height: viewport.height },
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.mouse.move(viewport.width * 0.72, viewport.height * 0.38);
  await page.waitForTimeout(1000);

  const layout = await page.evaluate(() => ({
    clippedSections: Array.from(document.querySelectorAll('.studio-page'))
      .filter((section) => section.scrollHeight > section.clientHeight + 2)
      .map((section) => section.id || 'cta'),
    favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
    hasCta: Boolean(document.querySelector('.cta-button')),
    textOverflow: Array.from(document.querySelectorAll('h1,h2,p,strong,button,a,span'))
      .filter((node) => node.scrollWidth > node.clientWidth + 2)
      .map((node) => node.textContent.trim())
      .slice(0, 5),
    title: document.title,
  }));

  const stageScreenshots = [];
  for (const locator of await page.locator('.three-stage').all()) {
    stageScreenshots.push(analyzePng(await locator.screenshot()));
  }

  await page.close();

  return {
    ...layout,
    stageScreenshots,
    viewport: viewport.name,
  };
}

function assertReport(report) {
  const failures = [];

  if (report.title !== 'Virdis Foundry') failures.push(`unexpected title: ${report.title}`);
  if (report.favicon !== '/favicon.svg') failures.push(`unexpected favicon: ${report.favicon}`);
  if (!report.hasCta) failures.push('missing CTA button');
  if (report.clippedSections.length > 0) failures.push(`clipped sections: ${report.clippedSections.join(', ')}`);
  if (report.textOverflow.length > 0) failures.push(`text overflow: ${report.textOverflow.join(' | ')}`);
  if (report.stageScreenshots.length !== 2) failures.push(`expected 2 Three.js stages, found ${report.stageScreenshots.length}`);

  report.stageScreenshots.forEach((stage, index) => {
    if (!stage.nonBlank) failures.push(`stage ${index + 1} appears blank`);
  });

  if (failures.length > 0) {
    throw new Error(`${report.viewport} UI verification failed:\n- ${failures.join('\n- ')}`);
  }
}

const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', port], {
  cwd: root,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  await waitForServer();

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || (existsSync('/snap/bin/chromium') ? '/snap/bin/chromium' : undefined);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  const reports = [];
  for (const viewport of [
    { height: 1000, name: 'desktop', width: 1440 },
    { height: 844, name: 'mobile', width: 390 },
  ]) {
    const report = await inspectViewport(browser, viewport);
    assertReport(report);
    reports.push(report);
  }

  await browser.close();
  console.log(JSON.stringify(reports, null, 2));
} finally {
  server.kill('SIGTERM');
}

import { existsSync } from 'node:fs';

export function getChromiumExecutablePath() {
  return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || (existsSync('/snap/bin/chromium') ? '/snap/bin/chromium' : undefined);
}

export function readPositiveIntegerEnv(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const value = Number.parseInt(rawValue, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

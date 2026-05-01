# Security

This project currently has a small browser-only runtime surface:

- React
- React DOM
- Three.js

There is no production Firebase, routing, API client, server runtime, or authentication dependency in the current application bundle.

## Dependency Checks

Run the production dependency audit before pushing changes:

```bash
npm run security:audit
```

Run the full local verification set for UI-facing changes:

```bash
npm run verify
```

`npm run verify` runs unit tests, the production build, browser UI verification, and the production dependency audit.

## Repository Automation

GitHub Actions runs the same verification gate on pull requests and pushes to `main`. Dependabot is configured for npm and GitHub Actions updates.

GitHub Dependabot remains the source of truth for repository-level dependency alerts. If GitHub reports an alert that local `npm audit` does not reproduce, inspect the alert directly:

```bash
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/sergiopesch/plant-watering-system/dependabot/alerts?state=open'
```

As of the current dependency lockfile, local production audit reports 0 vulnerabilities.

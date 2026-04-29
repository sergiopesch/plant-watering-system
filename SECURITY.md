# Security

Virdis Foundry currently has a small browser-only runtime surface:

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
npm test
npm run build
npm run verify:ui
npm run security:audit
```

## GitHub Dependabot

GitHub Dependabot is the source of truth for repository-level dependency alerts. If GitHub reports an alert that local `npm audit` does not reproduce, inspect the alert directly:

```bash
gh api -H 'Accept: application/vnd.github+json' \
  '/repos/sergiopesch/plant-watering-system/dependabot/alerts?state=open'
```

As of the current dependency lockfile, local production audit reports 0 vulnerabilities and GitHub Dependabot reports 0 open alerts.

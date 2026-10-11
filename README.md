# Learn Git

An interactive visualization platform that teaches Git and GitHub, from your first commit to rescuing a broken history. Every command you run in the in-browser sandbox is drawn as it happens and explained in plain words. Free, no account, nothing leaves your browser.

## Run

Requires Node.js 24 and npm.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # static production build
```

## Test

```bash
npm run lint && npm run typecheck && npm test -- --run
npx playwright install --with-deps   # once
npm run e2e
```

For the release candidate, `PERF_STRICT=1` turns the timing tripwires into the real budgets (`npm test -- --run --project timing`, `npx playwright test e2e/perf.spec.ts --project=chromium`).

## Docs

- [Context](docs/context.md): what the product is and its rules
- [Architecture](docs/architecture.md): how it is built
- [Design system](docs/design-system.md): the Office Hours theme

## Licence

[MIT](LICENSE), for the code and the lesson content.

Made by AIESEC Lebanon.

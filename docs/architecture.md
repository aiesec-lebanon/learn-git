# Learn Git: architecture

A fully static Next.js 16.4 App Router site. At build time the Git engine runs every lesson's scene and the pages prerender prose and each stage's first frame. In the browser, client islands load the engine on the first interaction (or when idle) and run every command locally. There is no server work at request time.

```
 build (next build)                                browser (static files from the CDN)
 content/ registry, *.mdx, scene.ts                prerendered HTML: prose + first stage frame
   │ runs scenes through                           client islands:
   ▼                                                 Stage ◄─ Session ◄─ engine (pure TS)
 engine/ ──► first frames, hero film,                 graph · terminal · chips · Hub · guide
             reference before/after states            announcer · sound · progress (localStorage)
 app/ routes (generateStaticParams, ensureStatic)    theme module (tokens, skin, guide, sounds, hero)
```

## Modules

| Folder                      | Holds                                                                                              | May import                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `engine/`                   | Pure TypeScript Git simulation; public API in `engine/index.ts`                                    | `@noble/hashes` only                         |
| `content/`                  | Registry, worlds, lessons (MDX + scene), capstones, scenarios, reference entries, puzzles          | `engine`                                     |
| `themes/`                   | Theme contract, token CSS, contrast helper, the active theme                                       | `ui`, `lib`                                  |
| `ui/`                       | Primitives styled by tokens (button, links, skip link, switch, visually hidden)                    | `lib`                                        |
| `features/`                 | React modules: site shell, preferences, stage, graph, terminal, chips, Hub, guide, sound, progress | `engine`, `content`, `themes`, `ui`, `lib`   |
| `app/`                      | Routes only                                                                                        | `features`, `content`, `themes`, `ui`, `lib` |
| `lib/`                      | Domain-free helpers                                                                                | nothing                                      |
| `e2e/`, `scripts/`, `docs/` | Playwright specs, the fixture recorder, these docs                                                 |                                              |

ESLint enforces the table per folder. Inside `engine/` it also bans React, Next.js, DOM, network, storage, clock, random and locale APIs, so the engine runs unchanged in Vitest, at build time and in the browser.

## One command, end to end

1. Typing, a chip, a drag or a Hub button becomes one invocation.
2. `Session.run` calls `execute(world, invocation)`, which returns the next world, Git's output and exit code, typed effects and, when an editor is needed, an interaction request.
3. The session records the step (Rewind, "Your path") and notifies React (`useSyncExternalStore`).
4. Consumers read the same effects: the stage plans and plays the choreography, narration writes "What happened" and one screen-reader announcement, sound maps effects to cues, the matcher checks the target, the par counter classifies the step.
5. Progress is written only on checkpoints, navigation and settings changes.

## Engine

- **Functional core:** immutable world snapshots, an append-only shared object pool, copy-on-write maps, `ReadonlyMap` for anything keyed by user input. The session is the only stateful part.
- **Real objects:** blobs, trees and commits serialized as Git does, SHA-1 IDs from `@noble/hashes`; IDs match real Git for the same inputs.
- **World:** repositories (refs, reflogs, object availability, commit arrival order, config), worktrees (HEAD, index with stages 0 to 3, files, current directory, paused operation), machines and identities, a simulated network, scripted actors, the Hub and a clock (2026-01-01, plus 60 s per invocation).
- **Layers:** objects, then refs, index and files, diff, merge, revisions, sequencer, commands, network, world, CLI (tokenizer, Git's option rules, dispatch, message catalog), session.
- **Editors** are interaction requests stored in the world and answered by a resume invocation, so Rewind and prerendering keep working.
- **Fidelity:** conformance fixtures recorded with Git for Windows 2.45.1 through Git Bash (`core.autocrlf=false`, `LANG=C`, `TZ=UTC`, fixed identities and dates; the version is pinned in each fixture's metadata) and replayed in Vitest, comparing output and object IDs exactly. Remote fixtures run several machines against bare repositories that stand in for `https://hub.test/` (an environment-only `insteadOf`, plus a hook that keeps the Hub URL in merge messages). `engine/limits.ts` caps input sizes and algorithmic work.

## Rendering and routes

- `cacheComponents` and `partialPrefetching` stay on; the root layout exports `ensureStatic = 'navigation'`, so any request-time work fails the build.
- Dynamic routes: `generateStaticParams` returns every registry ID; pages await `params` at the top and call `notFound()` for unknown IDs (Cache Components does not allow `dynamicParams`). An unknown ID renders once on demand, answers 404 and is then served from cache.
- Server Components render prose and first frames. Client islands: stage, terminal, chips, Hub, settings and progress. Browser-only state renders under `<Suspense>` with `use(browser())`.
- Cache Components keeps up to three visited routes mounted but hidden (Activity): every effect cleans up when hidden.
- Routes: `/`, `/start`, `/orientation`, `/tracks/[trackId]`, `/learn/[lessonId]`, `/capstones/[chapterId]`, `/scenarios/[scenarioId]`, `/playground`, `/reference`, `/reference/[entryId]`, `/challenges`, `/settings`, `/field-guide`, `sitemap.xml`, `robots.txt`. Later slices add IDs, not route types. The header links only routes that exist (typed routes reject the rest).

## Graph, motion and sound

- **Graph:** an ordered list of commit buttons (the accessible structure) over one hidden SVG layer for edges; a pure layout with fixed columns (arrival order) and sticky lanes, so commits never move; roving focus; one polite announcer; "Describe this graph".
- **Motion:** one policy (system setting plus in-app override, mirrored in `data-motion`; under reduce every `--dur-*` is 0); a Web Animations choreography runner with play, pause and seek; IntersectionObserver drives lesson beats; CSS scroll-driven effects only inside `@supports`; `<ViewTransition>` on lesson navigation; only `transform` and `opacity` animate.
- **Sound:** a lazily created Web Audio synth playing the theme's recipes; cues come from effects; refusals make no sound.

## Theme

One theme module, **Office Hours**, behind a typed contract (`themes/contract.ts`), chosen at build time in `themes/active.ts` (fonts in `themes/active-fonts.ts`, because `next/font` runs only in the Next.js build). Its parts are added as the features that use them arrive: tokens, scale, contrast pairs, fonts, logo and copy now; graph skin, icons, guide character, sound recipes and hero later. `themeToCss()` turns the tokens into CSS variables in a build-time `<style>`; `app/globals.css` maps them into Tailwind once (`bg-surface`, `text-fg-muted`, `rounded-btn`), so components never use `dark:` variants or Tailwind's default palette. An inline script (`applyDisplayPrefs`, serialized) sets `data-theme` and `data-motion` before the first paint, and `ThemeController` re-applies them after React's development remount. Every declared contrast pair is unit-tested in both modes.

## Persistence

`localStorage["learn-git"]` holds `{ v, resume, finished, prefs }`, where `prefs` is `{ theme, sound, motion, challengeMode, guide }`. Every read is size-capped, validated and filtered against the registry; versions migrate forward; a newer version is left untouched and treated as empty; when storage fails, an in-memory copy keeps the app working without warnings. The bootstrap script reads only `prefs.theme` and `prefs.motion`. The playground is never saved.

## The Hub

Hub state lives in the engine world, and Hub actions are invocations: they create real commits, emit effects, count for par and rewind with the sandbox. Original panels sit in a simulated browser frame at `hub.test`. Markdown renders with `react-markdown` and `remark-gfm`, without raw HTML; images show their alt text.

Content scripts take Hub steps beside typed lines (`Step = string | HubAction`): beats, solutions, expert paths, world setup (`{ machine, hub }`) and Hub cards in the reference. Branch rules apply once a world's setup has run. Targets can name pull requests (head, base, state, a standing review), issue states and whether a Hub repository exists. Teammates can act when a pull request gains commits their last review has not seen (`pull-updated`).

## Security

- Static headers from `headers()` in `next.config.ts` (`lib/security-headers.ts`): CSP `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (no `upgrade-insecure-requests`: WebKit applies it to `http://localhost`), plus HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP and `X-Frame-Options`; `poweredByHeader: false`. Nonces are not used because they would make every page dynamic.
- `dangerouslySetInnerHTML` only for two build-time constants (the bootstrap script and the theme CSS); learner text renders as text nodes; no `eval`; no code execution in the sandbox.
- Supply chain: committed lockfile, `npm ci --ignore-scripts`, signature and vulnerability audits in CI, Dependabot with a cooldown, actions pinned to commit SHAs, read-only workflow tokens.

## Testing

| Level                      | What runs                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and fixtures (Vitest) | Engine modules and commands; fixture scripts recorded from Git for Windows 2.45.1; engine coverage at least 90%; theme contrast and CSS                         |
| Properties (fast-check)    | Determinism, purity, referential integrity, Rewind, effects versus state, layout stability, matcher, tokenizer, diff, storage parsing                           |
| Content (Vitest)           | Every beat, target, par solution, scenario path and reference variant replays; voice and length rules                                                           |
| E2E (Playwright)           | Key journeys on Chromium, Firefox and WebKit plus phone emulation: keyboard only, chips only, reduced motion, storage blocked, no flash, axe, same-origin guard |

## Delivery

- GitHub Actions `ci.yml`: `verify` (audits, lint, format, typecheck, unit tests with coverage, build), then `e2e` on three browsers, then `gate`.
- Vercel Hobby (free) through its Git integration, connected after slice 1 is built. Deployment Checks then hold each production deployment until `gate` passes; Instant Rollback is the recovery path.
- Fallback: `output: 'export'` to any static host builds only with `cacheComponents` and `partialPrefetching` off and without `ensureStatic`; the headers then move to the host's configuration.

## Performance budgets

Field (p75): LCP 2.5 s, INP 200 ms, CLS 0.1 or less. Lab, compressed JavaScript: Home 170 KB, a lesson 230 KB before the engine; engine chunk 100 KB; Hub chunk with Markdown 60 KB; fonts 150 KB. Engine: p95 16 ms per command on Beginner worlds and 50 ms on a 300-commit world. Graph layout: 8 ms for 300 commits.

## Decisions

| #   | Decision                                                                 | Main alternative rejected                                                  |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | Custom TypeScript Git engine                                             | isomorphic-git (async, missing half the needed commands, not Git's output) |
| 2   | Functional core with immutable snapshots and typed effects               | Mutable model with an event emitter                                        |
| 3   | HTML nodes over SVG edges, stable layout                                 | All-SVG or canvas; DAG layout libraries that move nodes                    |
| 4   | Native motion (Web Animations, CSS, View Transitions)                    | GSAP, Motion, Lenis                                                        |
| 5   | MDX prose, typed scene scripts, one registry, replay tests               | Prose in data files; a headless CMS                                        |
| 6   | Fully static App Router with `notFound()` for unknown IDs                | `output: 'export'` as primary; client-only SPA                             |
| 7   | One build-time theme module behind a contract                            | Runtime multi-theme                                                        |
| 8   | One versioned `localStorage` document                                    | IndexedDB; cookies                                                         |
| 9   | The Hub as a domain inside the engine world                              | A separate store; real GitHub integration                                  |
| 10  | Layered modular monolith with lint-enforced boundaries                   | npm workspaces                                                             |
| 11  | Static CSP without nonces                                                | Nonce CSP through `proxy.ts`                                               |
| 12  | Vitest and Playwright in GitHub Actions, fixtures recorded from real Git | Real Git spawned in tests                                                  |
| 13  | Vercel Hobby with Deployment Checks, static-export fallback              | Deploying from Actions with a token                                        |
| 14  | Performance budgets; engine and Hub loaded lazily                        | Eager engine; engine in a Worker from day one                              |

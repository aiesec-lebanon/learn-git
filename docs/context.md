# Learn Git: context

Learn Git teaches Git and GitHub to software engineers by showing Git's real model (commits, refs, HEAD, the working tree, the staging area and remotes) and letting learners change it with real commands or by direct manipulation. It is free, public and needs no account. Credit, in text only: "by AIESEC Lebanon". Code and lesson content are MIT-licensed.

## Learners

| Track                   | Learner                                                     | Ships in |
| ----------------------- | ----------------------------------------------------------- | -------- |
| Beginner (B1 to B6)     | Writes code; new to Git or uses it only through IDE buttons | Slice 1  |
| Intermediate (I1 to I7) | Uses Git daily; avoids rebase, reset and the reflog         | Slice 2  |
| Pro (P1 to P7)          | Owns repositories, CI or releases                           | Slice 3  |

## Product rules

- A visualization platform, not a game or a quiz: no XP, levels, badges, streaks, leaderboards, points, scores, quizzes or multiple choice. Mastery is shown by reaching a repository state.
- Formats: scroll-told lessons with widgets, a free playground, scenario simulations, and a visual command reference with replayable before/after animations. Challenge mode (match the target graph, golf-style par) is opt-in and off by default.
- One in-browser sandbox behaves like Git for every covered command, hints and refusals included; its reference is Git for Windows 2.45.1. Anything else answers "not simulated here" with what real Git would do.
- The simulated host, working name **Hub**, behaves like GitHub and may reuse GitHub's short button and status labels; its name, logo, layout, icons and colours are original. GitHub is named only to say what is simulated.
- Privacy: progress stays in the browser (resume point, finished chapters and five non-personal preferences: theme, sound, motion, challenge mode, guide verbosity). No accounts, backend, cookies, personal data, analytics or third-party requests.
- Accessibility: WCAG 2.2 AA. Every checkpoint, capstone, scenario and puzzle can be finished with the keyboard only, with a screen reader, and with phone chips only. Reduced motion is honored, with an in-app override.
- Sound is subtle and muted by default; cues follow Git events, never success or failure. The guide, **Nib**, narrates, translates Git's refusals and gives hints only when asked. Nib may look pleased after a success, without praise words or rewards; it never scolds.
- English only. Desktop-first; phones use tap-based command chips.
- One theme ships: **Office Hours** (Git drawn at a whiteboard), with AIESEC blue as the main accent.

## How learning works

- A lesson has a cold open, 4 to 7 beats (one idea each, 60 words or fewer), "Your turn" (a sandbox with a visible target) and a wrap. Every beat can be replayed and scrubbed. Some beats ask the learner to predict before revealing.
- "What can you already do?" is an ungraded, hideable self-check that lets a learner skip ahead.
- A chapter is finished when its capstone reaches its target. "Show differences" says what still differs; nothing is scored or timed.
- Git's refusals are teaching material: the message verbatim, a one-line translation, what Git protected, and "Rewind sandbox (not a Git feature)".

## Delivery

- Vertical slices: the platform shell with the complete Beginner track, then Intermediate, then Pro.
- Every page is static and runs on Vercel's free Hobby plan. Vercel is connected after slice 1 is built.

## Engineering rules

- SOLID, KISS, DRY, YAGNI. The engine is clean-room: behavior and strings come from Git's documentation and recorded output; no Git source is read or ported.
- Tests: Vitest for the engine (fixtures recorded from real Git, property tests) and for content; Playwright for key journeys on Chromium, Firefox and WebKit; all in GitHub Actions.
- One Conventional Commit per task on `main`, pushed per feature. No co-author or attribution trailers. Dependabot pull requests merge as squash commits titled `build:` or `ci:`.
- Third-party code must be secure, industry-standard and free forever. A runtime dependency needs a gap the platform cannot fill.
- Docs: only `README.md`, `LICENSE`, `docs/context.md`, `docs/architecture.md`, `docs/design-system.md` and the Next.js-managed `AGENTS.md`. No long comments in code.

## Glossary

| Term        | Meaning                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| World       | Seeded state of everything simulated: repositories, machines, the Hub, scripted actors, the clock                                                 |
| Invocation  | One input: a command line, a Hub action or an editor answer                                                                                       |
| Outcome     | What `execute(world, invocation)` returns: the next world, Git's output and exit code, and effects                                                |
| Effect      | Typed event (object written, ref moved, HEAD changed, files changed, conflict, transfer, refusal) that drives animation, narration, sound and par |
| Session     | A sandbox's history: Rewind, previews and "Your path"                                                                                             |
| Beat, scene | One step of a lesson; the lesson's script of worlds and invocations                                                                               |
| Target      | A declared end state that the matcher checks                                                                                                      |
| Par         | Counted steps of a puzzle's reference solution                                                                                                    |
| Chips       | The tap-based command palette on phones                                                                                                           |
| Fixture     | A command script whose results were recorded from real Git and are replayed in tests                                                              |

## Adding content

1. **New Git behavior:** record fixtures first (`npm run fixtures:record`, in Git Bash with Git for Windows 2.45.1, `core.autocrlf=false`, `LANG=C`, `TZ=UTC`), then implement until they pass.
2. **Lesson:** add the registry entry; write `content/lessons/<id>/scene.ts` (world, beats, Your turn target, puzzle) and `lesson.mdx` (`<ColdOpen>`, `<Beat id>`, `<Widget>`, `<YourTurn>`, `<Wrap>`); run the tests; preview with `npm run dev`. Never type Git output into prose: the engine renders it.
3. **Scenario:** `defineScenario` with actors, triggers, acts, acceptable end states and expert paths.
4. **Reference entry:** `defineReferenceEntry` with presets, flag variants, up to three gotchas and legacy forms.

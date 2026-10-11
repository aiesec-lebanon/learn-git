# Learn Git: design system (Office Hours)

Git drawn at a whiteboard during office hours: a clean board, markers with one job each, sticky notes only for what moves, handwriting for what the guide adds and print for what you read. Calm by default. AIESEC blue `#037EF3` is the main accent.

Source of truth: `themes/officehours/` (tokens, scale, pairs, fonts, logo). Components use the Tailwind names mapped in `app/globals.css` (`bg-surface`, `text-fg-muted`, `border-line-strong`, `rounded-btn`, `shadow-1`, `ease-draw`, `font-display`), never raw colours or `dark:` variants.

## Colour

Light and dark follow the system; the learner can override it (`data-theme`). Every value below has a light and a dark token.

| Token                                               | Role                                                               | Light                   | Dark                 |
| --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------- | -------------------- |
| `bg`                                                | The board (page)                                                   | `#FAFBFC`               | `#15171B`            |
| `bg-alt`                                            | Bands, footer                                                      | `#EFF1F4`               | `#1A1D22`            |
| `surface`                                           | Paper: cards and printouts                                         | `#FFFFFF`               | `#1F2228`            |
| `sunk`                                              | Wells and inputs                                                   | `#EDF0F3`               | `#0F1114`            |
| `line`, `line-strong`                               | Dividers; control borders                                          | `#D8DCE2`, `#6E757F`    | `#2E333B`, `#737B87` |
| `fg`, `fg-muted`                                    | Black marker: text and history; secondary text                     | `#1B1D22`, `#4B515A`    | `#F1F2F4`, `#B3B9C2` |
| `accent`                                            | AIESEC blue: brand accents and graphics (never text)               | `#037EF3`               | `#037EF3`            |
| `focus`                                             | Focus ring                                                         | `#037EF3`               | `#037EF3`            |
| `accent-ink`                                        | Links and quiet buttons                                            | `#0266CC`               | `#6CB6FF`            |
| `accent-fill`, `accent-fill-hover`                  | Primary button                                                     | `#0266CC`, `#02529F`    | `#6CB6FF`, `#8CC4FF` |
| `on-accent`                                         | Label on the primary button                                        | `#FFFFFF`               | `#0F1114`            |
| `accent-soft`                                       | Notes and callouts                                                 | `#E6F1FE`               | `#0F2741`            |
| `hl`                                                | Yellow highlighter                                                 | `#FFE14D`               | `#4A4212`            |
| `guide`, `guide-ink`                                | Green marker: Nib's cap; Nib's notes                               | `#178246`, `#178246`    | `#3CCB86`, `#8EF0C1` |
| `shadow`, `sticky-shadow`, `nav-bg`                 | Paper shadow; note shadow; translucent header                      | rgba                    | rgba                 |
| `st-*` / `st-*-bg`                                  | File states: untracked, modified, staged, added, deleted, conflict | badge pairs             | badge pairs          |
| `g-bg`, `g-edge`, `g-node`, `g-node-fill`, `g-text` | Graph board, arrows, commit circles, hash text                     | black on white          | light on slate       |
| `g-b0` to `g-b3` (+ `-fg`)                          | Branch sticky notes; `g-b0` (yellow) is main                       | yellow, pink, mint, sky | same, brighter       |
| `g-head`, `g-head-fg`                               | Red marker: HEAD only                                              | `#C62E26`               | `#FF8A80`            |
| `g-remote`                                          | Remote-tracking labels (always dashed outline plus label)          | `#0266CC`               | `#6CB6FF`            |
| `g-dim`, `g-route`                                  | Unreachable ghosts; highlighted route (AIESEC blue)                | `#C2C7CF`, `#037EF3`    | `#3E444D`, `#037EF3` |
| `term-*`                                            | Terminal slate: text, muted, command echo, error                   | dark slate              | darker slate         |

Rules: AIESEC blue is 3.98:1 on white, so it is used only where 3:1 suffices (graphics, focus, highlights) and never carries white text; the derived `#0266CC` and `#6CB6FF` carry text and fills. Red marks HEAD and nothing else. Yellow is the highlighter and main's note. Green belongs to Nib, so the guide never looks like part of Git. Colour is never the only signal.

### Contrast

`themes/officehours/pairs.ts` declares 44 pairs (text 4.5:1, UI and graphics 3:1); `themes/active.test.ts` checks every pair in both modes. Key ratios:

| Pair                      | Tokens                          | Needs | Light | Dark  |
| ------------------------- | ------------------------------- | ----- | ----- | ----- |
| Body text on the board    | `fg` on `bg`                    | 4.5   | 16.27 | 16.02 |
| Secondary text on bands   | `fg-muted` on `bg-alt`          | 4.5   | 7.07  | 8.56  |
| Links on bands            | `accent-ink` on `bg-alt`        | 4.5   | 4.92  | 7.86  |
| Links on notes            | `accent-ink` on `accent-soft`   | 4.5   | 4.87  | 7.05  |
| Primary button label      | `on-accent` on `accent-fill`    | 4.5   | 5.56  | 8.80  |
| AIESEC blue on the board  | `accent` on `bg`                | 3     | 3.84  | 4.51  |
| Focus ring on paper       | `focus` on `surface`            | 3     | 3.98  | 4.01  |
| Control borders on paper  | `line-strong` on `surface`      | 3     | 4.65  | 3.73  |
| Nib's notes               | `guide-ink` on `g-bg`           | 4.5   | 4.86  | 11.67 |
| HEAD written on the board | `g-head` on `g-bg`              | 4.5   | 5.50  | 6.98  |
| Remote-tracking label     | `g-remote` on `g-bg`            | 4.5   | 5.56  | 7.42  |
| Deleted badge             | `st-deleted` on `st-deleted-bg` | 4.5   | 5.12  | 7.61  |

## Type

| Utility        | Face               | Size                | Use                                    |
| -------------- | ------------------ | ------------------- | -------------------------------------- |
| `text-display` | Shantell Sans 800  | 60 to 128 px, fluid | Product name                           |
| `text-4xl`     | Shantell Sans 700  | 40 to 68 px, fluid  | Hero headline                          |
| `text-3xl`     | Shantell Sans 700  | 32 to 44 px, fluid  | Page and section titles                |
| `text-xl`      | Figtree 700        | 24 px               | Card and step titles                   |
| `text-base`    | Figtree 400        | 17 px, 1.6          | Body                                   |
| `text-sm`      | JetBrains Mono 500 | 14 px               | Commands and hashes, never handwritten |
| `text-xs`      | Shantell Sans 600  | 12 px               | Notes in the margin                    |

Fonts are self-hosted with `next/font` (Latin subset, `swap`; only Shantell Sans is preloaded; weight axes only, which keeps the three families under 150 KB). Shantell Sans writes the board (titles, notes, Nib's lines), Figtree sets everything read at length, JetBrains Mono sets every command and hash: nothing a learner might type is handwritten. All three use the SIL Open Font License.

## Spacing, radii, elevation

- **Spacing:** Tailwind's 4 px grid. Preferred steps: 4, 8, 12, 16, 24, 36, 52, 72, 104 px. Content width 1200 px with 16 px gutters on phones and 24 px from `sm`; the page never scrolls sideways.
- **Radii:** slightly uneven, like a quick hand. `rounded-xs` status codes, `rounded-sm` small paper, `rounded-md` marker boxes, `rounded-lg` large paper, `rounded-btn` buttons, `rounded-pill` chips and switches.
- **Elevation:** paper casts a short shadow; marker outlines cast none. `shadow-1` a note on the board, `shadow-2` a note being moved and tooltips, `shadow-3` overlays only.

## Motion

| Token   | Duration | Use                                  |
| ------- | -------- | ------------------------------------ |
| `dur-1` | 120 ms   | Press, toggle, hover                 |
| `dur-2` | 200 ms   | Tooltips, file rows, notes lifting   |
| `dur-3` | 520 ms   | A stroke is drawn or a note is moved |
| `dur-4` | 900 ms   | Lesson scene changes, writing a line |

Easings: `ease-standard` (everyday UI), `ease-draw` (a steady pull, then the pen lifts), `ease-stick` (a note pressed on with a small give). Only `transform` and `opacity` animate.

Choreography: draw in the order Git writes (the new commit, then its arrow back to the parent); then HEAD's note peels off and presses onto the new commit while every other note stays put. History is never redrawn to look tidier. Unreachable history fades to a ghost. Parallax only separates the four depths (working tree, staging area, repository, origin).

Reduced motion (system setting or `data-motion="reduce"`): every `--dur-*` becomes 0; strokes appear complete, notes jump, the hero holds one frame, parallax is off, Nib holds still while its expressions still change.

## Git visual language

- Time runs left to right, one column per commit. Every arrow starts at a commit and points back to its parent, the only link Git stores. The root commit has a short bar on its left.
- A commit is a hand-drawn circle with its short hash beneath; a merge commit is circled twice. Commits never move.
- Branches are sticky notes above one commit. HEAD is circled in red with an arrow to its note; detached HEAD says so and points straight at a commit.
- Remote-tracking branches (`origin/main`) are dashed outlines with their full label; on origin's own board the same branch is a solid note.
- Commits nothing points to fade like an erased drawing; `git reflog` can still find them.
- File states pair a letter code with a colour (`?? M A D U`), never colour alone.

## Components

- **Button** (`ui/button.tsx`): `type="button"` by default, 44 px tall, uneven corners. Primary (blue fill, one per view), secondary (paper with a marker border), quiet (blue ink). Disabled at 45% opacity.
- **Links** (`ui/link.tsx`): `AppLink` for routes (typed), `ExternalLink` opens a new tab and says so to screen readers. Blue ink, underlined.
- **Skip link**, **visually hidden**, **switch** (`role="switch"`, label is its text, blue track when on).
- **Focus:** a 3 px AIESEC-blue ring with a 2 px gap on every focusable element; it reads on the board, paper, notes and the slate.
- **Hub** (`features/hub/`): a simulated browser window (marker-bordered, address bar on the sunk band, `hub.test/...`) with in-sandbox Back and Forward. Repository sections are buttons with `aria-current="page"` that scroll sideways on phones; on phones the stage and the Hub show one at a time. Icons come from the theme (`themes/officehours/icons.tsx`, hand-drawn strokes, `aria-hidden`), always next to words. States read in words (Open, Merged, Closed, "This branch has conflicts that must be resolved"). Diffs pair `+`/`−` with tinted rows and spoken words; Markdown renders without raw HTML.
- **Shell:** translucent sticky header with the logo (two commits, the arrow back, main's note), one `main`, footer credit "Learn Git by AIESEC Lebanon".

## Nib, the guide

A green whiteboard marker who keeps office hours. Warm, patient and a little dry: Nib draws what changed, circles it and gives the next step. Nib never stands for anything in Git.

| State           | When                                                     |
| --------------- | -------------------------------------------------------- |
| `idle`          | Waiting; office hours are open                           |
| `explaining`    | Narrating a beat                                         |
| `pointing`      | Lighting up the part of the board that changed           |
| `refusal`       | Git refused a command ("Hm."), with the translation      |
| `acknowledging` | Stating an outcome as information                        |
| `pleased`       | A brief pose after a success; no praise words or rewards |

Voice: name the Git term right after the idea; draw first, then explain in one short line; say what changed as a state, then what to try next. Never "just", "simply", "easy" or "obviously"; no "Great job" or "Oops"; no exclamation marks, emoji or scores.

## Sound

Muted by default; small desk sounds under 1 s, cued by Git events, never by success or failure, and none on refusals.

- **Commit:** a marker tap (soft knock, tiny tick, muted A5).
- **Merge:** a note pressed flat (low paper press, D5 and F♯5 together).
- **Conflict:** a questioning hum (two taps, a low hum rising a semitone).

## Accessibility

- WCAG 2.2 AA in both themes, measured from the tokens (see Contrast).
- Keyboard: a skip link first; visible focus everywhere; targets at least 24 px, 44 px for buttons and chips.
- Screen readers: one polite announcer; learner text renders as text inside `<bdi>`; external links say they open a new tab.
- Motion and colour: reduced motion honored with an in-app override; no information by colour alone.
- Phones: lessons, boards and Nib work in full; the playground uses command chips; the board scrolls inside its frame, never the page.

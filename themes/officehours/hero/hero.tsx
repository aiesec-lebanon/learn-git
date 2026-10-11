import type { ThemeHero } from "../../contract";

/** The whiteboard example on Home: the stage, what ran, and the guide's line. */
export const Hero: ThemeHero = ({ shot, commands, at, stage, controls }) => (
  <figure
    aria-labelledby="hero-title"
    className="m-0 grid gap-4 rounded-sm border border-line bg-surface p-4 shadow-2 sm:p-6"
  >
    <figcaption className="flex flex-wrap items-center justify-between gap-3">
      <span id="hero-title" className="font-display text-lg font-bold">
        An example that runs by itself
      </span>
      {controls}
    </figcaption>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">{stage}</div>
      <div className="grid content-start gap-3">
        <p className="m-0 text-sm text-fg-muted">{shot.who}</p>
        <p className="m-0 rounded-sm bg-term-bg px-3 py-2 font-mono text-sm text-term-fg">
          <span aria-hidden="true" className="text-term-accent">
            ${" "}
          </span>
          {shot.command}
        </p>
        <p className="m-0">{shot.say}</p>
        <ol className="m-0 grid gap-1 pl-5 text-sm text-fg-muted">
          {commands.map((command, i) => (
            <li
              key={i}
              aria-current={i === at ? "step" : undefined}
              className="aria-[current]:font-semibold aria-[current]:text-fg"
            >
              <code className="font-mono">{command}</code>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </figure>
);

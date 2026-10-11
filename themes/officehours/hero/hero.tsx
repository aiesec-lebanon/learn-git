import type { CSSProperties } from "react";
import type { ThemeHero } from "../../contract";
import { Nib } from "../guide/character";
import { handLine, hashStr } from "../skin/strokes";
import s from "./hero.module.css";

/** Four markers, one job each: the theme's colour rule, shown as its key. */
const MARKERS = [
  ["var(--fg)", "History and text"],
  ["var(--g-head)", "HEAD"],
  ["var(--accent)", "Links and origin"],
  ["var(--guide)", "Nib's notes"],
] as const;

function Marker({ colour }: { colour: string }) {
  return (
    <svg
      viewBox="0 0 48 14"
      aria-hidden="true"
      focusable="false"
      style={{ "--mk": colour } as CSSProperties}
    >
      <rect className={s.body} x="1" y="2" width="30" height="10" rx="3" />
      <rect className={s.cap} x="30" y="1.5" width="12" height="11" rx="3" />
      <path className={s.cap} d="M42 5l5 2-5 2z" />
    </svg>
  );
}

/** The whiteboard example on Home: the board, the command written on in marker, and Nib's line. */
export const Hero: ThemeHero = ({
  shot,
  commands,
  at,
  stage,
  controls,
  animate,
}) => (
  <figure
    aria-labelledby="hero-title"
    className={`${s.hero} ${animate ? s.animate : ""}`}
  >
    <figcaption className={s.head}>
      <span id="hero-title" className="font-display text-lg font-bold">
        An example that runs by itself
      </span>
      {controls}
    </figcaption>
    <div className={s.layout}>
      <div className={s.board} data-depth="board">
        {stage}
      </div>
      <div className={s.say} data-depth="say">
        <p className={s.who}>{shot.who}</p>
        <div key={at}>
          <p className={s.cmd}>{shot.command}</p>
          <svg
            className={s.underline}
            viewBox="0 0 200 6"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path pathLength="1" d={handLine(200, hashStr(shot.command))} />
          </svg>
        </div>
        <div className={s.nibline}>
          <div className={s.nib}>
            <Nib pose={shot.mood} animate={animate} />
          </div>
          <p key={at} className={s.line}>
            {shot.say}
          </p>
        </div>
        <ol className={s.steps}>
          {commands.map((command, i) => (
            <li key={i} aria-current={i === at ? "step" : undefined}>
              <code className="font-mono">{command}</code>
            </li>
          ))}
        </ol>
      </div>
    </div>
    <ul className={s.tray} aria-label="Marker colours">
      {MARKERS.map(([colour, job]) => (
        <li key={job} className={s.marker}>
          <Marker colour={colour} />
          {job}
        </li>
      ))}
    </ul>
  </figure>
);

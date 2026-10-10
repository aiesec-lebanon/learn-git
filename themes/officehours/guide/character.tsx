import type { GuideCharacter } from "../../contract";
import s from "./character.module.css";

/** Nib, a green whiteboard marker: the cap comes off to point. Decoration only. */
export const Nib: GuideCharacter = ({ pose, animate }) => (
  <svg
    viewBox="0 0 120 120"
    aria-hidden="true"
    focusable="false"
    data-pose={pose}
    className={`${s.nib} ${animate ? s.animate : ""}`}
  >
    <g className={s.all}>
      <ellipse className={s.shadow} cx="60" cy="114" rx="25" ry="3.6" />
      <path className={s.swoosh} pathLength="1" d="M101 55q11 6 11 19" />
      <path className={s.zing} d="M37 6l5 8M60 1v10M83 6l-5 8" />
      <g className={`${s.arm} ${s.armL}`}>
        <path className={s.limb} d="M41 77L29 91" />
        <circle className={s.hand} cx="28" cy="92" r="3.8" />
      </g>
      <g className={`${s.arm} ${s.armR}`}>
        <path className={s.limb} d="M79 77L91 91" />
        <circle className={s.hand} cx="92" cy="92" r="3.8" />
      </g>
      <path className={s.barrel} d="M46 43L52 29H68L74 43Z" />
      <path className={s.felt} d="M53.5 29L56.5 19H63.5L66.5 29Z" />
      <rect className={s.barrel} x="40" y="38" width="40" height="73" rx="11" />
      <rect className={s.cap} x="40" y="93" width="40" height="8" />
      <rect
        className={s.felt}
        x="46"
        y="104.5"
        width="28"
        height="5"
        rx="2.5"
      />
      {pose === "pleased" ? (
        <path
          className={s.stroke}
          d="M47.5 64.5q4.5-6 9 0M63.5 64.5q4.5-6 9 0"
        />
      ) : (
        <g className={`${s.ink} ${s.eyes}`}>
          <circle cx="52" cy="63" r="3.7" />
          <circle cx="68" cy="63" r="3.7" />
        </g>
      )}
      {pose === "surprised" ? (
        <>
          <path
            className={s.stroke}
            d="M47 54.5q5-4 10-1.5M63 53q5-2.5 10 1.5"
          />
          <circle className={s.ink} cx="60" cy="75.5" r="3.6" />
        </>
      ) : pose === "explaining" ? (
        <ellipse
          className={`${s.ink} ${s.face} ${s.talk}`}
          cx="60"
          cy="74.5"
          rx="4.6"
          ry="3.4"
        />
      ) : pose === "pleased" ? (
        <path className={s.stroke} d="M51.5 71.5q8.5 8.5 17 0" />
      ) : (
        <path className={s.stroke} d="M54.5 73.5q5.5 4 11 0" />
      )}
      <g className={s.capGroup}>
        <rect className={s.cap} x="37" y="14" width="46" height="34" rx="10" />
        <path className={s.shine} d="M45.5 21v19" />
        <path className={s.stroke} d="M83 19.5h2.5a3 3 0 0 1 3 3v15" />
      </g>
    </g>
  </svg>
);

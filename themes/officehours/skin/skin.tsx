import type { SkinLabel, SkinNode, ThemeSkin } from "../../contract";
import { edgePath, handRing, hashStr, tilt } from "./strokes";

const R = 12;
const GLYPH = 8;

const NOTE: Record<SkinLabel["slot"], string> = {
  0: "bg-g-b0 text-g-b0-fg",
  1: "bg-g-b1 text-g-b1-fg",
  2: "bg-g-b2 text-g-b2-fg",
  3: "bg-g-b3 text-g-b3-fg",
};

/** One hand-drawn circle; a merge is circled twice; a root gets a start bar; a ghost fades and dashes. */
function Node({ node }: { node: SkinNode }) {
  const seed = hashStr(node.id) % 100000;
  const faint = node.ghost > 0;
  return (
    <>
      <svg
        width={2 * R + 6}
        height={2 * R + 6}
        viewBox={`${-R - 3} ${-R - 3} ${2 * R + 6} ${2 * R + 6}`}
        aria-hidden="true"
        focusable="false"
        className={`block overflow-visible transition-opacity duration-(--dur-4) ${faint ? "opacity-45" : ""}`}
      >
        {node.root ? (
          <path
            d={`M${-R - 9} -9V9`}
            fill="none"
            stroke="var(--g-node)"
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        ) : null}
        <path
          d={handRing(R - 1, R - 1, seed)}
          fill="var(--g-node-fill)"
          stroke={faint ? "var(--g-dim)" : "var(--g-node)"}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={faint ? "3 3" : undefined}
        />
        {node.merge ? (
          <path
            d={handRing(R - 5.6, R - 5.6, seed + 7, 0.45)}
            fill="none"
            stroke="var(--g-node)"
            strokeWidth={2.3}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <span
        aria-hidden="true"
        className="absolute top-full left-1/2 mt-1 -translate-x-1/2 font-mono text-[10.5px] leading-none text-g-text"
      >
        {node.short}
      </span>
    </>
  );
}

/** A label with its small print (counters, last contact) underneath. */
function Label({ label }: { label: SkinLabel }) {
  if (!label.note) return <LabelBody label={label} />;
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <LabelBody label={label} />
      <span className="font-display text-[11px] leading-3 whitespace-nowrap text-g-text">
        {label.note}
      </span>
    </span>
  );
}

/** Branches are sticky notes, HEAD is circled in red, remote-tracking labels are dashed. */
function LabelBody({ label }: { label: SkinLabel }) {
  const text = <bdi>{label.text}</bdi>;
  if (label.kind === "head") {
    const w = Math.round(label.text.length * 8.3 + 30);
    return (
      <span
        className="relative inline-flex h-7 items-center justify-center font-display text-[13px] font-extrabold text-g-head"
        style={{ width: w }}
      >
        <svg
          className="absolute inset-0 overflow-visible"
          width={w}
          height={28}
          aria-hidden="true"
          focusable="false"
        >
          <path
            transform={`translate(${w / 2} 14)`}
            d={handRing(w / 2 - 2, 11.5, hashStr(label.text) % 997, 0.42)}
            fill="var(--g-bg)"
            stroke="var(--g-head)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative">{text}</span>
      </span>
    );
  }
  if (label.kind === "remote" || label.kind === "tag") {
    const style =
      label.kind === "remote"
        ? "border-dashed border-g-remote text-g-remote"
        : "border-solid border-g-node text-g-text";
    return (
      <span
        className={`inline-block max-w-40 truncate rounded-xs border-[1.8px] bg-g-bg px-1.5 font-display text-xs font-semibold leading-5 ${style}`}
      >
        {label.kind === "tag" ? "tag: " : null}
        {text}
      </span>
    );
  }
  return (
    <span
      className={`inline-block max-w-40 truncate rounded-xs px-2.5 font-display text-[13px] leading-7 shadow-1 ${NOTE[label.slot]} ${label.current ? "font-extrabold" : "font-semibold"}`}
      style={{ rotate: `${tilt(label.text)}deg` }}
    >
      {text}
    </span>
  );
}

export const skin: ThemeSkin = {
  graph: {
    column: 108,
    lane: 92,
    glyph: GLYPH,
    pad: 36,
    node: R,
    top: 96,
    bottom: 40,
  },
  edgePath: (edge) => edgePath(edge, R + 3, 108),
  Node,
  Label,
};

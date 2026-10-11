import type { HubIconName } from "../contract";

const ink = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Marker strokes on a 20 × 20 board; each drawn by hand, never a host's icon. */
const PATHS: Readonly<Record<HubIconName, readonly string[]>> = {
  repo: [
    "M4.5 3.2C7.6 2.9 11.8 3 15.4 3.3L15.6 16.6C11.9 16.4 8 16.5 4.6 16.8Z",
    "M7.2 3.4L7.1 16.6",
    "M9.6 7.2H13.1M9.6 10.2H12.4",
  ],
  branch: [
    "M6 3.4V16.4",
    "M6 11.6C6.2 8.8 9 8.4 12 8.2",
    "M12.2 6.2C13.4 5.9 14.6 6.8 14.6 8.1C14.6 9.4 13.5 10.3 12.3 10.1C11.1 9.9 10.5 8.8 10.8 7.6",
  ],
  commit: [
    "M2.6 10.1H6.6M13.4 10H17.4",
    "M9.8 6.6C11.9 6.4 13.5 8 13.4 10C13.4 12 11.8 13.5 9.9 13.4C7.9 13.3 6.5 11.8 6.6 9.9C6.7 8.4 7.7 7.2 9.1 6.8",
  ],
  pull: [
    "M5.6 3.6V16.4",
    "M14.4 16.4V8.2C14.4 6.4 13.2 5.4 11.4 5.4H8.4",
    "M10.2 3.4L8.2 5.4L10.2 7.4",
  ],
  merged: [
    "M5.8 3.4V16.6",
    "M5.8 6.6C6.4 10.4 9.6 12.4 14.2 12.6",
    "M12.2 10.4L14.4 12.6L12.2 14.8",
  ],
  issue: [
    "M10 3.2C13.9 3.1 16.9 6.2 16.8 10C16.7 13.8 13.8 16.8 10 16.8C6.2 16.8 3.2 13.8 3.2 10C3.3 7.2 5 4.9 7.5 3.8",
    "M10 6.6V10.6",
    "M10 13.3V13.4",
  ],
  "issue-closed": [
    "M10 3.2C13.9 3.1 16.9 6.2 16.8 10C16.7 13.8 13.8 16.8 10 16.8C6.2 16.8 3.2 13.8 3.2 10C3.3 7.2 5 4.9 7.5 3.8",
    "M6.8 10.2L9.1 12.4L13.4 7.6",
  ],
  file: [
    "M5 2.8H11.6L15.2 6.4V17.2H5.1Z",
    "M11.4 3V6.6H15",
    "M7.6 10.2H12.6M7.6 13H11.4",
  ],
  folder: ["M2.8 5.2H7.8L9.4 6.9H17.2V15.6H2.9Z", "M2.9 8.6H17"],
  comment: [
    "M3.4 4.2C7.6 3.8 12.4 3.9 16.6 4.3L16.4 12.8C13.6 12.9 11 12.9 8.4 13L5.2 16.2L5.4 13C4.6 13 3.9 13 3.4 12.9Z",
  ],
  check: ["M4 10.6L8 14.4L16.2 5.6"],
  alert: ["M10 3.4L17.2 16.2H2.8Z", "M10 8V11.6", "M10 13.9V14"],
  back: ["M16 10H4.4", "M8.6 5.6L4.2 10L8.6 14.4"],
  forward: ["M4 10H15.6", "M11.4 5.6L15.8 10L11.4 14.4"],
};

/** A decorative Hub icon in the theme's hand; the words next to it carry the meaning. */
export function Icon({
  name,
  className,
}: {
  name: HubIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-4 shrink-0"}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} {...ink} />
      ))}
    </svg>
  );
}

const ink = {
  fill: "none",
  stroke: "var(--fg)",
  strokeWidth: 2.1,
  strokeLinecap: "round",
} as const;

/** Two hand-drawn commits, the arrow back to the parent, and main's note. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect
        x="13.2"
        y="2.6"
        width="11.2"
        height="8.4"
        rx="1"
        transform="rotate(5 18.8 6.8)"
        fill="var(--g-b0)"
        stroke="var(--fg)"
        strokeWidth="1.5"
      />
      <path
        d="M10.4 19.6H16.4M12.8 16.9L10 19.6L12.8 22.3"
        {...ink}
        strokeLinejoin="round"
      />
      <path
        d="M4.6 16.2C6.4 15.5 8.4 16.5 9.2 18.2C9.9 20 9.2 22.1 7.4 22.9C5.6 23.7 3.6 22.7 2.8 20.9C2.1 19.2 3 17.3 4.7 16.5C5.3 16.3 5.9 16.5 6.5 16.6"
        {...ink}
      />
      <path
        d="M19.6 16C21.6 15.6 23.4 17 23.8 18.9C24.2 20.7 23 22.6 21.1 23.1C19.2 23.5 17.4 22.2 17.1 20.3C16.7 18.5 17.9 16.7 19.7 16.3C20.3 16.2 20.9 16.5 21.4 16.7"
        {...ink}
      />
    </svg>
  );
}

import { ImageResponse } from "next/og";
import { tokens } from "@/themes/active-tokens";

export const alt =
  "Learn Git: a whiteboard with two commits joined by a line, a sticky note labelled main, and HEAD circled in red.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const t = tokens.light;

/** The social preview, rendered once at build time. */
export default function OpengraphImage() {
  const commit = (left: number) => ({
    position: "absolute" as const,
    left,
    top: 380,
    width: 64,
    height: 64,
    borderRadius: 32,
    border: `6px solid ${t.fg}`,
    background: t.surface,
  });
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: t.bg,
        border: `24px solid ${t["line-strong"]}`,
        fontFamily: "sans-serif",
        color: t.fg,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 70,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 800 }}>Learn Git</div>
        <div style={{ fontSize: 40, color: t["fg-muted"] }}>
          Git and GitHub, explained at the whiteboard.
        </div>
      </div>
      <div style={commit(520)} />
      <div
        style={{
          position: "absolute",
          left: 590,
          top: 409,
          width: 190,
          height: 6,
          background: t.fg,
        }}
      />
      <div style={commit(780)} />
      <div
        style={{
          position: "absolute",
          left: 760,
          top: 360,
          width: 104,
          height: 104,
          borderRadius: 52,
          border: `5px solid ${t["g-head"]}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 880,
          top: 300,
          padding: "12px 28px",
          background: t.hl,
          fontSize: 40,
          fontWeight: 700,
          transform: "rotate(-3deg)",
        }}
      >
        main
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 50,
          fontSize: 30,
          color: t["accent-ink"],
          fontWeight: 700,
        }}
      >
        by AIESEC Lebanon
      </div>
    </div>,
    size,
  );
}

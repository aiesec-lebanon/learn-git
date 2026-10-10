"use client";

import { useSyncExternalStore } from "react";
import { scale } from "@/themes/active";

export type MotionMode = "full" | "reduce";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Reduced when the learner's override or the system asks for it (ADR-004). */
export function resolveMotion(
  override: string | null,
  systemReduce: boolean,
): MotionMode {
  return override === "reduce" || systemReduce ? "reduce" : "full";
}

function subscribe(onChange: () => void): () => void {
  const media = matchMedia(QUERY);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

const snapshot = () =>
  resolveMotion(
    document.documentElement.getAttribute("data-motion"),
    matchMedia(QUERY).matches,
  );

/** The motion policy; the server and first render assume reduced motion. */
export function useMotion(): MotionMode {
  return useSyncExternalStore(subscribe, snapshot, () => "reduce");
}

const ms = (value: string) => Number.parseFloat(value);

export type MotionTokens = {
  readonly quick: number;
  readonly draw: number;
  readonly stagger: number;
  readonly easing: Readonly<Record<"standard" | "draw" | "stick", string>>;
};

/** The theme's motion timing in milliseconds. */
export const motionTokens: MotionTokens = {
  quick: ms(scale.dur["2"]),
  draw: ms(scale.dur["3"]),
  stagger: 60,
  easing: {
    standard: scale.curve.standard,
    draw: scale.curve.draw,
    stick: scale.curve.stick,
  },
};

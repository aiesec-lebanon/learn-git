import { ViewTransition, type ReactNode } from "react";

/** Transition types for links deeper into the course, and back out. */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

const BY_TYPE = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

/** Slides page content by navigation direction; untyped navigations swap instantly. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={BY_TYPE} exit={BY_TYPE} default="none">
      {children}
    </ViewTransition>
  );
}

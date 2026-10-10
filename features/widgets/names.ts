export const WIDGET_NAMES = [
  "snapshot-scrubber",
  "git-reveal",
  "identity-form",
] as const;

export type WidgetName = (typeof WIDGET_NAMES)[number];

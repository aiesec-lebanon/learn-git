export const WIDGET_NAMES = [
  "snapshot-scrubber",
  "git-reveal",
  "identity-form",
  "stage-files",
  "status-lens",
] as const;

export type WidgetName = (typeof WIDGET_NAMES)[number];

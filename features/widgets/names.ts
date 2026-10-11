export const WIDGET_NAMES = [
  "snapshot-scrubber",
  "git-reveal",
  "identity-form",
  "stage-files",
  "status-lens",
  "history-scrubber",
  "hash-chain",
  "diff-anatomy",
  "diff-lens",
  "restore-picker",
  "destructive-preview",
  "file-state-map",
  "pattern-lab",
  "pointer-drag",
  "reachability",
  "lost-preview",
  "leave-preview",
] as const;

export type WidgetName = (typeof WIDGET_NAMES)[number];

/** Sandbox caps (senior-engineer section 3); every command respects them. */
export const LIMITS = {
  lineChars: 2000,
  words: 200,
  pasteLines: 20,
  fileChars: 100_000,
  files: 500,
  pathDepth: 20,
  messageChars: 10_000,
  hubTextChars: 10_000,
  historySnapshots: 500,
  sandboxes: 5,
  diffLines: 2000,
  renameCandidates: 100,
} as const;

export type RevisionStep = {
  /** `~n` walks n first parents; `^n` takes the nth parent (`^0` is the commit). */
  readonly kind: "ancestor" | "parent";
  readonly n: number;
};

export type ParsedRevision = {
  readonly base: string;
  readonly steps: readonly RevisionStep[];
};

const STEP = /^([~^])(\d*)/;

/** Splits `HEAD~2^` into a base name and suffix steps; null when the syntax is outside the Beginner subset. */
export function parseRevision(text: string): ParsedRevision | null {
  const cut = text.search(/[~^]/);
  const name = cut < 0 ? text : text.slice(0, cut);
  if (!/^[^\s:{}]+$/.test(name) || name.includes("..")) return null;
  const steps: RevisionStep[] = [];
  let rest = cut < 0 ? "" : text.slice(cut);
  while (rest) {
    const match = STEP.exec(rest);
    if (!match) return null;
    const [whole, sign, digits] = match;
    steps.push({
      kind: sign === "~" ? "ancestor" : "parent",
      n: digits ? Number(digits) : 1,
    });
    rest = rest.slice(whole.length);
  }
  return { base: name === "@" ? "HEAD" : name, steps };
}

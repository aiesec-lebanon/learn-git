/** The one localStorage key and its document version (ADR-008). */
export const STORAGE_KEY = "learn-git";
export const SCHEMA_VERSION = 1;
/** Longer raw values are ignored, not parsed. */
export const MAX_RAW_LENGTH = 16 * 1024;

export type ResumePointer = {
  readonly kind: "lesson" | "scenario";
  readonly id: string;
  /** Lessons: beat index, the beat count means "at Your turn". Scenarios: acts reached. */
  readonly step: number;
};

export type Prefs = {
  readonly theme: "system" | "light" | "dark";
  readonly sound: boolean;
  readonly motion: "system" | "reduce";
  readonly challengeMode: boolean;
  readonly guide: "full" | "light" | "off";
  /** Offer predict-and-reveal before key operations. */
  readonly predictions: boolean;
};

/** Everything stored: no timestamps, answers, sandbox contents or identifiers. */
export type ProgressDoc = {
  readonly v: typeof SCHEMA_VERSION;
  readonly resume: ResumePointer | null;
  readonly finished: readonly string[];
  readonly prefs: Prefs;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  sound: false,
  motion: "system",
  challengeMode: false,
  guide: "full",
  predictions: true,
};

export const EMPTY_DOC: ProgressDoc = {
  v: SCHEMA_VERSION,
  resume: null,
  finished: [],
  prefs: DEFAULT_PREFS,
};

/** The content IDs a document may refer to. */
export type RegistryIds = {
  readonly lessons: readonly string[];
  readonly chapters: readonly string[];
  readonly scenarios: readonly string[];
};

const MAX_STEP = 99;

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const oneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

const flag = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

function parsePrefs(value: unknown): Prefs {
  const p = record(value) ?? {};
  const d = DEFAULT_PREFS;
  return {
    theme: oneOf(p.theme, ["system", "light", "dark"], d.theme),
    sound: flag(p.sound, d.sound),
    motion: oneOf(p.motion, ["system", "reduce"], d.motion),
    challengeMode: flag(p.challengeMode, d.challengeMode),
    guide: oneOf(p.guide, ["full", "light", "off"], d.guide),
    predictions: flag(p.predictions, d.predictions),
  };
}

function parseResume(value: unknown, ids: RegistryIds): ResumePointer | null {
  const r = record(value);
  if (!r || typeof r.id !== "string") return null;
  const known =
    r.kind === "lesson"
      ? ids.lessons.includes(r.id)
      : r.kind === "scenario" && ids.scenarios.includes(r.id);
  if (!known) return null;
  const step = Number.isInteger(r.step) ? (r.step as number) : 0;
  return {
    kind: r.kind as ResumePointer["kind"],
    id: r.id,
    step: Math.min(Math.max(step, 0), MAX_STEP),
  };
}

export type Parsed = {
  readonly doc: ProgressDoc;
  /** False for a document from a newer version: it is left untouched. */
  readonly writable: boolean;
};

/**
 * Validates a stored document: unknown fields and IDs are dropped, anything
 * unreadable counts as empty. The first migration arrives with version 2.
 */
export function parseProgress(raw: string | null, ids: RegistryIds): Parsed {
  const empty = { doc: EMPTY_DOC, writable: true };
  if (raw === null || raw.length > MAX_RAW_LENGTH) return empty;
  let data: Record<string, unknown> | null;
  try {
    data = record(JSON.parse(raw));
  } catch {
    return empty;
  }
  if (!data || typeof data.v !== "number") return empty;
  if (data.v > SCHEMA_VERSION) return { doc: EMPTY_DOC, writable: false };
  if (data.v !== SCHEMA_VERSION) return empty;
  const finished = Array.isArray(data.finished)
    ? [...new Set(data.finished)].filter(
        (id): id is string =>
          typeof id === "string" && ids.chapters.includes(id),
      )
    : [];
  return {
    doc: {
      v: SCHEMA_VERSION,
      resume: parseResume(data.resume, ids),
      finished,
      prefs: parsePrefs(data.prefs),
    },
    writable: true,
  };
}

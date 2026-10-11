import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/lib/storage";
import {
  DEFAULT_PREFS,
  EMPTY_DOC,
  MAX_RAW_LENGTH,
  parseProgress,
  STORAGE_KEY,
} from "./schema";
import { createProgressStore } from "./store";

const ids = { lessons: ["b1-1"], chapters: ["b1", "b2"] };
const resume = { kind: "lesson", id: "b1-1", step: 3 } as const;

function memory(initial: string | null = null) {
  const data = new Map<string, string>();
  if (initial !== null) data.set(STORAGE_KEY, initial);
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

const failing = (error: string): StorageLike => ({
  getItem: () => {
    throw new DOMException(error, error);
  },
  setItem: () => {
    throw new DOMException(error, error);
  },
  removeItem: () => {
    throw new DOMException(error, error);
  },
});

describe("parseProgress", () => {
  it("keeps a valid document", () => {
    const doc = {
      v: 1,
      resume,
      finished: ["b1"],
      prefs: { ...DEFAULT_PREFS, theme: "dark", guide: "off" },
    };
    expect(parseProgress(JSON.stringify(doc), ids)).toEqual({
      doc,
      writable: true,
    });
  });

  it("drops unknown fields, unknown IDs and bad values", () => {
    const raw = JSON.stringify({
      v: 1,
      resume: { kind: "lesson", id: "b9-9", step: 2 },
      finished: ["b1", "b1", "zz", 4],
      prefs: {
        theme: "neon",
        sound: "yes",
        motion: "reduce",
        predictions: "no",
        extra: 1,
      },
      name: "Sam",
    });
    expect(parseProgress(raw, ids).doc).toEqual({
      v: 1,
      resume: null,
      finished: ["b1"],
      prefs: { ...DEFAULT_PREFS, motion: "reduce" },
    });
  });

  it("clamps the step", () => {
    const raw = (step: unknown) =>
      JSON.stringify({ v: 1, resume: { ...resume, step } });
    expect(parseProgress(raw(-4), ids).doc.resume?.step).toBe(0);
    expect(parseProgress(raw(1e6), ids).doc.resume?.step).toBe(99);
    expect(parseProgress(raw(1.5), ids).doc.resume?.step).toBe(0);
  });

  it("treats junk, oversized and older documents as empty", () => {
    for (const raw of [
      null,
      "{",
      "[]",
      "null",
      '{"v":"1"}',
      '{"v":0}',
      `{"v":1,"pad":"${"x".repeat(MAX_RAW_LENGTH)}"}`,
    ])
      expect(parseProgress(raw, ids)).toEqual({
        doc: EMPTY_DOC,
        writable: true,
      });
  });

  it("leaves a newer version alone", () => {
    expect(parseProgress('{"v":2,"resume":{}}', ids)).toEqual({
      doc: EMPTY_DOC,
      writable: false,
    });
  });

  it("is not polluted by __proto__ payloads", () => {
    const raw =
      '{"v":1,"__proto__":{"polluted":true},"prefs":{"__proto__":{"theme":"dark"}}}';
    const { doc } = parseProgress(raw, ids);
    expect(doc.prefs).toEqual(DEFAULT_PREFS);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(doc).sort()).toEqual([
      "finished",
      "prefs",
      "resume",
      "v",
    ]);
  });

  it("always returns a document of exactly the schema", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json()), (raw) => {
        const { doc } = parseProgress(raw, ids);
        expect(Object.keys(doc).sort()).toEqual([
          "finished",
          "prefs",
          "resume",
          "v",
        ]);
        expect(Object.keys(doc.prefs).sort()).toEqual(
          Object.keys(DEFAULT_PREFS).sort(),
        );
      }),
    );
  });
});

describe("createProgressStore", () => {
  it("writes through and notifies", () => {
    const { data, storage } = memory();
    const store = createProgressStore(storage, ids);
    let calls = 0;
    store.subscribe(() => calls++);
    store.setResume(resume);
    store.finishChapter("b1");
    store.finishChapter("b1");
    store.setPrefs({ sound: true });
    expect(calls).toBe(3);
    expect(JSON.parse(data.get(STORAGE_KEY) ?? "")).toEqual({
      v: 1,
      resume,
      finished: ["b1"],
      prefs: { ...DEFAULT_PREFS, sound: true },
    });
  });

  it("keeps the snapshot reference until something changes", () => {
    const store = createProgressStore(memory().storage, ids);
    const first = store.getSnapshot();
    store.setPrefs({ sound: false });
    expect(store.getSnapshot()).toBe(first);
  });

  it("works in memory when storage throws", () => {
    for (const error of ["SecurityError", "QuotaExceededError"]) {
      const store = createProgressStore(failing(error), ids);
      store.setResume(resume);
      expect(store.getSnapshot().resume).toEqual(resume);
      store.reset();
      expect(store.getSnapshot()).toBe(EMPTY_DOC);
    }
    const none = createProgressStore(null, ids);
    none.setResume(resume);
    expect(none.getSnapshot().resume).toEqual(resume);
  });

  it("never overwrites a newer document", () => {
    const newer = '{"v":2,"x":1}';
    const { data, storage } = memory(newer);
    const store = createProgressStore(storage, ids);
    store.setResume(resume);
    expect(data.get(STORAGE_KEY)).toBe(newer);
    store.reset();
    store.setResume(resume);
    expect(JSON.parse(data.get(STORAGE_KEY) ?? "").v).toBe(1);
  });

  it("validates what other tabs write", () => {
    const store = createProgressStore(memory().storage, ids);
    let calls = 0;
    store.subscribe(() => calls++);
    store.receive(JSON.stringify({ v: 1, resume, finished: ["b2", "x"] }));
    expect(store.getSnapshot().finished).toEqual(["b2"]);
    store.receive(null);
    expect(store.getSnapshot()).toBe(EMPTY_DOC);
    expect(calls).toBe(2);
  });
});

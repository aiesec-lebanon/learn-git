import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import type { ReferencePreset } from "../define";
import { voiceProblems } from "../guide/voice";
import { lessonById } from "../registry";
import { REFERENCE } from "./registry";

const start = (preset: ReferencePreset) => {
  const session = new Session(createWorld(preset.world));
  for (const line of preset.setup ?? []) session.run(line);
  return session;
};

describe("reference registry", () => {
  it("has unique IDs", () => {
    const ids = REFERENCE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

for (const entry of REFERENCE) {
  describe(`reference ${entry.id}`, () => {
    it("keeps to three gotchas in the guide's voice and real lessons", () => {
      expect(entry.gotchas.length).toBeLessThanOrEqual(3);
      for (const text of [entry.summary, ...entry.gotchas])
        expect(voiceProblems(text), text).toEqual([]);
      for (const id of entry.lessons) expect(lessonById(id)).toBeDefined();
    });

    it("runs every form on every preset without waiting for input", () => {
      for (const preset of entry.presets)
        for (const variant of entry.variants) {
          const session = start(preset);
          session.run(variant.command);
          expect(session.getSnapshot().pending, variant.command).toBeNull();
        }
    });

    it.each(entry.variants)("$command does what it claims", (variant) => {
      expect(variant.after ?? variant.shows).toBeDefined();
      const preset =
        entry.presets.find((p) => p.id === variant.preset) ?? entry.presets[0];
      expect(preset.id).toBe(variant.preset ?? entry.presets[0].id);
      const session = start(preset);
      const before = session.getSnapshot().world;
      const [result] = session.run(variant.command);
      const output = result?.outcome.output;
      if (variant.shows)
        expect(`${output?.stdout}${output?.stderr}`).toContain(variant.shows);
      if (variant.after) {
        expect(match(before, variant.after).ok).toBe(false);
        const after = session.getSnapshot().world;
        expect(match(after, variant.after).differences).toEqual([]);
      }
    });
  });
}

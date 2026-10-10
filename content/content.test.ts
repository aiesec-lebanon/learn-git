import { describe, expect, it } from "vitest";
import { countPar, createWorld, match, Session } from "@/engine";
import { CAPSTONES } from "./capstones";
import type { Checkpoint } from "./define";
import { voiceProblems } from "./guide/voice";
import { SCENES } from "./lessons";
import { CHAPTERS, LESSONS, readyLessons } from "./registry";

const ALLOWED = new Set([
  "ColdOpen",
  "Beat",
  "Widget",
  "YourTurn",
  "Wrap",
  "Term",
  "Cmd",
]);
const MAX_BEAT_WORDS = 60;

const MDX = import.meta.glob<string>("./lessons/*/lesson.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
});
const mdxOf = (id: string) => MDX[`./lessons/${id}/lesson.mdx`];

/** Prose without code, where tags and words are counted. */
const prose = (mdx: string) =>
  mdx.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");

function mdxProblems(mdx: string): string[] {
  const text = prose(mdx);
  const problems: string[] = [];
  if (/^\s*(import|export)\s/m.test(text))
    problems.push("imports or exports code");
  for (const [, tag] of text.matchAll(/<\/?([A-Za-z][\w.]*)/g)) {
    if (tag && !ALLOWED.has(tag)) problems.push(`uses <${tag}>`);
  }
  const outside = text
    .replace(/<([A-Z]\w*)[^>]*\/>/g, "")
    .replace(/<([A-Z]\w*)[^>]*>[\s\S]*?<\/\1>/g, "");
  if (outside.trim()) problems.push("has prose outside a component");
  for (const problem of voiceProblems(text.replace(/<[^>]*>/g, " ")))
    problems.push(problem);
  return problems;
}

function mdxBeats(mdx: string): { id: string; words: number }[] {
  return [
    ...prose(mdx).matchAll(/<Beat\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/Beat>/g),
  ].map(([, id = "", body = ""]) => ({
    id,
    words: body
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter((w) => /[\p{L}\p{N}]/u.test(w)).length,
  }));
}

function replay(checkpoint: Checkpoint) {
  const session = new Session(createWorld(checkpoint.world));
  for (const line of checkpoint.solution) session.run(line);
  return session.getSnapshot();
}

describe("content harness", () => {
  it("reads beats, tags and voice from MDX text", () => {
    const sample =
      '<Beat id="a" title="T">One two `<b>` three.</Beat>\n<Beat id="b">Four <Cmd>git init</Cmd></Beat>';
    expect(mdxBeats(sample)).toEqual([
      { id: "a", words: 3 },
      { id: "b", words: 3 },
    ]);
    expect(mdxProblems(sample)).toEqual([]);
    expect(mdxProblems('import x from "y"\n<div>Simply!</div>')).toEqual([
      "imports or exports code",
      "uses <div>",
      "uses <div>",
      "has prose outside a component",
      'says "Simply"',
      "uses an exclamation mark",
    ]);
  });
});

describe("registry", () => {
  it("has unique IDs and known chapters", () => {
    const ids = [...CHAPTERS, ...LESSONS].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const chapters = new Set<string>(CHAPTERS.map((c) => c.id));
    for (const lesson of LESSONS) expect(chapters).toContain(lesson.chapter);
  });

  it("has content for exactly the ready lessons", () => {
    const ready = readyLessons()
      .map((l) => l.id)
      .sort();
    expect(Object.keys(SCENES).sort()).toEqual(ready);
    const written = Object.keys(MDX)
      .map((path) => path.split("/")[2])
      .sort();
    expect(written).toEqual(ready);
  });
});

for (const lesson of readyLessons()) {
  describe(`lesson ${lesson.id}`, () => {
    const scene = SCENES[lesson.id];
    const mdx = mdxOf(lesson.id) ?? "";

    it("keeps its prose to the allowed components and the guide's voice", () => {
      expect(mdxProblems(mdx)).toEqual([]);
    });

    it("has the same beats in prose and scene, each short", () => {
      const beats = mdxBeats(mdx);
      expect(beats.map((b) => b.id)).toEqual(scene?.beats.map((b) => b.id));
      for (const beat of beats)
        expect(beat.words, beat.id).toBeLessThanOrEqual(MAX_BEAT_WORDS);
    });

    it("replays every beat without a refusal", () => {
      const session = new Session(createWorld(scene?.world));
      for (const beat of scene?.beats ?? [])
        for (const line of beat.run ?? [])
          for (const entry of session.run(line))
            expect(entry.outcome.output.exitCode, entry.text).toBe(0);
    });

    it("reaches the Your turn target with its solution, not before", () => {
      if (!scene) throw new Error("no scene");
      const { yourTurn } = scene;
      expect(match(createWorld(yourTurn.world), yourTurn.target).ok).toBe(
        false,
      );
      const end = replay(yourTurn);
      expect(match(end.world, yourTurn.target).differences).toEqual([]);
    });

    it("solves the challenge in par", () => {
      const challenge = scene?.challenge;
      if (!challenge) return;
      const end = replay(challenge);
      expect(match(end.world, challenge.target).differences).toEqual([]);
      expect(countPar(end.history)).toBe(challenge.par);
    });
  });
}

for (const [chapter, capstone] of Object.entries(CAPSTONES)) {
  describe(`capstone ${chapter}`, () => {
    it("belongs to its chapter and is reached by its solution, not before", () => {
      if (!capstone) throw new Error("no capstone");
      expect(capstone.chapter).toBe(chapter);
      expect(match(createWorld(capstone.world), capstone.target).ok).toBe(
        false,
      );
      const end = replay(capstone);
      for (const entry of end.history)
        expect(entry.outcome.output.exitCode, entry.text).toBe(0);
      expect(match(end.world, capstone.target).differences).toEqual([]);
    });
  });
}

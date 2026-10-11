import { describe, expect, it } from "vitest";
import { REFUSAL_FACTS } from "@/engine";
import { REFUSAL_GUIDE } from "./guide/refusals";
import { voiceProblems } from "./guide/voice";
import { SCENES } from "./lessons";
import { REFERENCE } from "./reference/registry";
import { SCENARIO_SCENES } from "./scenarios";
import { SELF_CHECK } from "./self-check";

/** Every string in a value, except command lines and Git's own output. */
function prose(value: unknown, key = ""): string[] {
  if (["command", "shows", "run", "solution", "id"].includes(key)) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => prose(v, key));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => prose(v, k));
  return [];
}

const ORIENTATION = import.meta.glob<string>("./orientation.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
});

const sources: [string, unknown][] = [
  [
    "orientation",
    Object.values(ORIENTATION).map((t) => t.replace(/`[^`]*`/g, "")),
  ],
  ["refusal translations", REFUSAL_GUIDE],
  ["refusal facts", REFUSAL_FACTS],
  ["self-check", SELF_CHECK],
  ...REFERENCE.map((e): [string, unknown] => [
    `reference ${e.id}`,
    { title: e.title, summary: e.summary, gotchas: e.gotchas },
  ]),
  ...Object.values(SCENES).flatMap((s): [string, unknown][] =>
    s?.challenge ? [[`puzzle ${s.id}`, s.challenge.underPar ?? []]] : [],
  ),
  ...Object.values(SCENARIO_SCENES).flatMap((s): [string, unknown][] =>
    s ? [[`scenario ${s.id} brief`, s.brief]] : [],
  ),
];

describe("copy outside lessons keeps the guide's voice", () => {
  it.each(sources)("%s", (_, value) => {
    const problems = prose(value).flatMap((text) =>
      voiceProblems(text).map((p) => `${p}: ${text}`),
    );
    expect(problems).toEqual([]);
  });
});

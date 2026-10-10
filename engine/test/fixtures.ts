/// <reference types="vite/client" />

export const PINNED_GIT = "2.45.1";

export type ScriptStep = string | { cmd: string; editor: string };

export type FixtureWorld = {
  files?: Record<string, string>;
  dirs?: string[];
  cwd?: string;
  global?: Record<string, string>;
  system?: Record<string, string>;
};

export type FixtureScript = {
  world?: FixtureWorld;
  steps: ScriptStep[];
  mode?: "full" | "seeded";
};

export type RecordedObject =
  | { type: "blob" | "commit" | "tag"; body: string }
  | { type: "tree"; entries: { mode: string; name: string; oid: string }[] };

export type RecordedRepo = {
  head: { ref: string } | { oid: string };
  refs: Record<string, string>;
  objects: Record<string, RecordedObject>;
  index: { mode: string; oid: string; stage: number; path: string }[];
  config: [string, string | null][];
  reflogs: Record<string, string[]>;
};

export type RecordedStep = {
  cmd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  editor?: { received: string | null; wrote: string | null };
};

export type RecordedFixture = {
  id: string;
  git: string;
  script: FixtureScript;
  steps: RecordedStep[];
  final: {
    files: Record<string, string>;
    dirs: string[];
    config: {
      system: [string, string | null][];
      global: [string, string | null][];
    };
    repos: Record<string, RecordedRepo>;
  };
};

const idOf = (file: string, folder: string) =>
  file.slice(file.indexOf(folder) + folder.length).replace(/\.json$/, "");

function byId<T>(modules: Record<string, T>, folder: string) {
  return new Map(
    Object.entries(modules).map(([file, value]) => [idOf(file, folder), value]),
  );
}

export const fixtureScripts: ReadonlyMap<string, FixtureScript> = byId(
  import.meta.glob<FixtureScript>("../__fixtures__/scripts/**/*.json", {
    eager: true,
    import: "default",
  }),
  "/scripts/",
);

export const recordedFixtures: readonly RecordedFixture[] = [
  ...byId(
    import.meta.glob<Omit<RecordedFixture, "id">>(
      "../__fixtures__/recorded/**/*.json",
      { eager: true, import: "default" },
    ),
    "/recorded/",
  ),
].map(([id, fixture]) => ({ ...fixture, id }));

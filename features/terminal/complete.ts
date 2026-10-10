import {
  commands,
  listDir,
  machineOf,
  resolvePath,
  shellQuote,
  shortRefName,
  discoverRepo,
  type World,
} from "@/engine";

export type Completion = {
  /** The input with the last word completed as far as it is unambiguous. */
  readonly line: string;
  /** Every candidate when there is more than one. */
  readonly options: readonly string[];
};

function commonPrefix(words: readonly string[]): string {
  let prefix = words[0] ?? "";
  for (const w of words)
    while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

function candidates(
  world: World,
  words: readonly string[],
  partial: string,
): string[] {
  const all = commands();
  if (words.length === 0)
    return [
      "git",
      ...all.filter((c) => c.program === "shell").map((c) => c.name),
    ];
  const [program, sub] = words;
  if (program === "git" && words.length === 1)
    return all.filter((c) => c.program === "git").map((c) => c.name);
  if (program === "git" && partial.startsWith("-"))
    return [
      ...(all.find((c) => c.program === "git" && c.name === sub)?.flags ?? []),
    ];
  const machine = machineOf(world);
  const slash = partial.lastIndexOf("/");
  const dir = resolvePath(
    machine.cwd,
    slash < 0 ? "." : partial.slice(0, slash + 1),
  );
  const lead = slash < 0 ? "" : partial.slice(0, slash + 1);
  const paths = listDir(machine.fs, dir)
    .filter((e) => e.name !== ".git")
    .map((e) => `${lead}${e.name}${e.dir ? "/" : ""}`);
  const repo = program === "git" ? discoverRepo(world, machine) : null;
  const branches = [...(repo?.refs.keys() ?? [])].map(shortRefName);
  return [...new Set([...paths, ...branches])];
}

/** Tab completion for the last word: commands, subcommands, flags, paths and branches. */
export function complete(world: World, line: string): Completion {
  const words = line.split(/\s+/).filter(Boolean);
  const partial = /\s$/.test(line) || !line ? "" : (words.pop() ?? "");
  const head = line.slice(0, line.length - partial.length);
  const matches = candidates(world, words, partial)
    .filter((c) => c.startsWith(partial))
    .sort();
  if (matches.length === 0) return { line, options: [] };
  if (matches.length === 1) {
    const [only = ""] = matches;
    const end = only.endsWith("/") ? "" : " ";
    return { line: `${head}${shellQuote(only)}${end}`, options: [] };
  }
  return { line: `${head}${commonPrefix(matches)}`, options: matches };
}

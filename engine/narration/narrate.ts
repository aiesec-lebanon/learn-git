import { subjectOf } from "../commit/message";
import { displayRelative, relativeTo } from "../files/paths";
import { isGitPath } from "../files/worktree";
import { hubEventSentence } from "../hub/events";
import { abbreviate } from "../objects/abbrev";
import { readObject } from "../objects/pool";
import { shortRefName } from "../refs/names";
import type { Effect, Oid, RepoId, World } from "../types";
import { machineOf } from "../world/access";
import { REFUSAL_FACTS } from "./refusals";

export type Narration = {
  /** "What happened": one plain sentence per event, in causal order. */
  readonly whatHappened: readonly string[];
  /** One screen-reader message for the invocation, 25 words or fewer. */
  readonly announcement: string;
};

const MAX_WORDS = 25;
const SUBJECT_WORDS = 8;
const LISTED = 3;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function clip(text: string, words: number): string {
  const all = text.split(/\s+/).filter(Boolean);
  return all.length <= words ? text : `${all.slice(0, words).join(" ")}…`;
}

function list(items: readonly string[]): string {
  const shown = items.slice(0, LISTED);
  const more = items.length - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

/** Narrates one invocation's effects against the world it produced. */
export function narrate(effects: readonly Effect[], world: World): Narration {
  const machine = machineOf(world);
  const id = (oid: Oid) => abbreviate(world.objects, oid);
  const subject = (oid: Oid) =>
    `"${clip(subjectOf(readObject(world.objects, oid, "commit").message), SUBJECT_WORDS)}"`;
  const home = (path: string) => {
    const rel = relativeTo(machine.home, path);
    return rel === null ? path : rel ? `~/${rel}` : "~";
  };
  const here = (path: string) => displayRelative(machine.cwd, path) || ".";
  const repoName = (repo: RepoId) => {
    const found = world.repos.get(repo);
    if (found?.bare)
      return `the Hub (${found.workdir.slice(1).replace(/\.git$/, "")})`;
    return found ? home(found.workdir) : repo;
  };
  const inRepo = (repo: RepoId, path: string) =>
    here(`${world.repos.get(repo)?.workdir ?? ""}/${path}`);

  const lines: string[] = [];
  const stored = { blob: 0, tree: 0 };
  const commits: Oid[] = [];
  for (const e of effects) {
    if (e.kind === "object-written") {
      if (e.type === "commit") commits.push(e.oid);
      else stored[e.type] += 1;
    }
  }
  const objectParts = [
    stored.blob ? `${plural(stored.blob, "blob")} (file contents)` : "",
    stored.tree ? `${plural(stored.tree, "tree")} (folder listings)` : "",
  ].filter(Boolean);
  if (objectParts.length) lines.push(`Stored ${objectParts.join(" and ")}.`);
  for (const oid of commits) {
    const parents = readObject(world.objects, oid, "commit").parents;
    const tail = parents.length
      ? `, parent ${parents.map(id).join(" and ")}`
      : ", the first commit (no parent)";
    lines.push(`Recorded commit ${id(oid)} ${subject(oid)}${tail}.`);
  }

  for (const e of effects) {
    switch (e.kind) {
      case "object-written":
      case "screen-cleared":
        break;
      case "repo-created":
        lines.push(
          e.reinitialized
            ? `The repository in ${repoName(e.repo)} already existed; nothing was lost.`
            : `Created an empty Git repository in ${repoName(e.repo)} (the hidden .git folder).`,
        );
        break;
      case "ref-updated": {
        const hosted = world.repos.get(e.repo);
        const name = hosted?.bare
          ? `${shortRefName(e.ref)} on the Hub (${hosted.workdir.slice(1).replace(/\.git$/, "")})`
          : shortRefName(e.ref);
        if (e.from === null && e.to !== null)
          lines.push(`${name} now points at ${id(e.to)}.`);
        else if (e.to === null && e.from !== null)
          lines.push(`${name} was deleted; it pointed at ${id(e.from)}.`);
        else if (e.from !== null && e.to !== null)
          lines.push(`${name} moved from ${id(e.from)} to ${id(e.to)}.`);
        break;
      }
      case "head-changed":
        lines.push(
          e.to.kind === "symbolic"
            ? `HEAD now points at ${shortRefName(e.to.ref)}.`
            : `HEAD is detached at ${id(e.to.oid)}.`,
        );
        break;
      case "index-changed": {
        const kind = { added: "new", modified: "changed", deleted: "removal" };
        lines.push(
          `Staged ${list(e.changes.map((c) => `${inRepo(e.repo, c.path)} (${kind[c.change]})`))}.`,
        );
        break;
      }
      case "files-changed": {
        const verbs = {
          added: "Created",
          modified: "Changed",
          deleted: "Deleted",
        };
        for (const change of ["added", "modified", "deleted"] as const) {
          const names = e.changes
            .filter((c) => c.change === change && !isGitPath(c.path))
            .map((c) =>
              c.node === "dir" ? `folder ${here(c.path)}` : here(c.path),
            );
          if (names.length) lines.push(`${verbs[change]} ${list(names)}.`);
        }
        break;
      }
      case "config-changed":
        lines.push(
          e.to === null
            ? `Removed ${e.key} from the ${e.scope} config.`
            : `Set ${e.key} to "${clip(e.to, SUBJECT_WORDS)}" in the ${e.scope} config.`,
        );
        break;
      case "cwd-changed":
        lines.push(`Moved into ${home(e.to)}.`);
        break;
      case "operation":
        lines.push(
          `The ${e.operation} ${e.phase === "paused" ? "paused" : `was ${e.phase}`}.`,
        );
        break;
      case "conflict":
        lines.push(
          `Conflicts in ${list(e.paths.map((p) => inRepo(e.repo, p)))}.`,
        );
        break;
      case "transfer":
        lines.push(
          `Copied ${plural(e.oids.length, "object")} from ${repoName(e.from)} to ${repoName(e.to)}.`,
        );
        break;
      case "refused":
        lines.push(`Nothing changed. ${REFUSAL_FACTS[e.code]}`);
        break;
      case "actor":
        lines.push(e.says ?? `${e.actor} acted.`);
        break;
      case "hub":
        lines.push(hubEventSentence(e.actor, e.event));
        break;
      default: {
        const never: never = e;
        return never;
      }
    }
  }
  if (!lines.length) lines.push("Nothing changed.");
  return {
    whatHappened: lines,
    announcement: announce(effects, lines, id, subject),
  };
}

function announce(
  effects: readonly Effect[],
  lines: readonly string[],
  id: (oid: Oid) => string,
  subject: (oid: Oid) => string,
): string {
  const actor = effects.find((e) => e.kind === "actor");
  if (actor?.kind === "actor") {
    return clip(actor.says ?? `${actor.actor} acted.`, MAX_WORDS);
  }
  const hub = effects.flatMap((e) =>
    e.kind === "hub" ? [hubEventSentence(e.actor, e.event)] : [],
  );
  if (hub.length) return clip(hub.join(" "), MAX_WORDS);
  const commit = effects.find(
    (e) => e.kind === "object-written" && e.type === "commit",
  );
  if (commit?.kind === "object-written") {
    const ref = effects.find(
      (e) => e.kind === "ref-updated" && e.to === commit.oid,
    );
    if (ref?.kind === "ref-updated") {
      const name = shortRefName(ref.ref);
      const head = `Committed ${id(commit.oid)} ${subject(commit.oid)} on ${name}`;
      return clip(
        ref.from === null
          ? `${head}, its first commit.`
          : `${head}; ${name} moved from ${id(ref.from)} to ${id(commit.oid)}.`,
        MAX_WORDS,
      );
    }
  }
  let out = "";
  for (const line of lines) {
    const next = out ? `${out} ${line}` : line;
    if (out && next.split(/\s+/).length > MAX_WORDS) break;
    out = next;
  }
  return clip(out, MAX_WORDS);
}

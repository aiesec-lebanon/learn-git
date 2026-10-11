import { flag, type OptionSpec } from "../cli/options";
import { twoWayCheckout } from "../checkout/two-way";
import { reflogWho } from "../config/identity";
import { remoteSection } from "../config/remotes";
import { resolvePath } from "../files/paths";
import { listDir, makeDir } from "../files/worktree";
import { notSimulated } from "../messages/git";
import { CLONE_USAGE, cloneMessages as m } from "../messages/clone";
import { branchRef, shortRefName } from "../refs/names";
import { appendReflog } from "../refs/reflog";
import { updateRef } from "../refs/refs";
import { writeGuard } from "../shell/registry";
import type { ConfigFile, Effect, RefName, Repo } from "../types";
import { repoIdFor, repoOf, withMachine, withRepo } from "../world/access";
import { connect, transfer } from "../world/network";
import { NEW_REPO_CONFIG } from "./init";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "quiet", short: "q", long: "quiet" },
  x("branch", "b", "required"),
  x("origin", "o", "required"),
  x("bare"),
  x("mirror"),
  x("depth", undefined, "required"),
  x("single-branch"),
  x("no-checkout", "n"),
  x("recurse-submodules", undefined, "optional"),
  x("filter", undefined, "required"),
  x("template", undefined, "required"),
  x("config", "c", "required"),
  x("local", "l"),
  x("shared", "s"),
  x("reference", undefined, "required"),
  x("separate-git-dir", undefined, "required"),
  x("verbose", "v"),
  x("progress"),
];

/** The folder Git names after the URL: its last part without `.git`. */
export function guessDir(url: string): string {
  const path = url.replace(/\/+$/, "").replace(/\/\.git$/, "");
  return (path.split(/[/:]/).at(-1) ?? "").replace(/\.git$/, "");
}

const ORIGIN = "origin";
const tracking = (ref: RefName) =>
  `refs/remotes/${ORIGIN}/${shortRefName(ref)}` as RefName;

export const clone = defineCommand({
  name: "clone",
  counted: true,
  needsRepo: false,
  usage: CLONE_USAGE,
  options: OPTIONS,
  run: ({ world, machine, options, time }) => {
    const unsupported = refuseUnsimulated("clone", options);
    if (unsupported) return unsupported;
    const [url, dir, ...rest] = options.args;
    if (url === undefined) return refuse("usage", m.noRepository(), 129);
    if (rest.length) return refuse("usage", m.tooMany(), 129);
    const name = dir ?? guessDir(url);
    const path = resolvePath(machine.cwd, name);
    const guard = writeGuard(path);
    if (guard) return refuse("not-simulated", notSimulated(guard), 1);
    const taken =
      machine.fs.files.has(path) ||
      (machine.fs.dirs.has(path) && listDir(machine.fs, path).length > 0);
    if (taken) return refuse("destination-exists", m.destinationExists(name));
    if (!url.includes("://")) {
      return refuse("no-remote", m.doesNotExist(url));
    }
    const quiet = flag(options, "quiet");
    const cloning = quiet ? "" : m.cloningInto(name);
    const reached = connect(world, url);
    if (!reached.ok) {
      return refuse("no-remote", cloning + reached.stderr);
    }
    const source = reached.repo;
    const fs = makeDir(makeDir(machine.fs, path), `${path}/.git`);
    const effects: Effect[] = [
      {
        kind: "files-changed",
        machine: machine.id,
        changes: [...fs.dirs]
          .filter((d) => !machine.fs.dirs.has(d))
          .map((d) => ({ path: d, change: "added", node: "dir" })),
      },
    ];
    const remoteHead =
      source.head.kind === "symbolic" ? source.head.ref : branchRef("main");
    const branch = shortRefName(remoteHead);
    const config: ConfigFile = [
      ...NEW_REPO_CONFIG,
      ...remoteSection(ORIGIN, url),
      { key: `branch.${branch}.remote`, value: ORIGIN },
      { key: `branch.${branch}.merge`, value: remoteHead },
    ];
    const id = repoIdFor(machine.id, path);
    const branches = [...source.refs].filter(([ref]) =>
      ref.startsWith("refs/heads/"),
    );
    let repo: Repo = {
      id,
      machine: machine.id,
      workdir: path,
      head: { kind: "symbolic", ref: remoteHead },
      refs: new Map(branches.map(([ref, oid]) => [tracking(ref), oid])),
      reflogs: new Map(),
      index: new Map(),
      config,
      arrival: [],
    };
    effects.push({ kind: "repo-created", repo: id, reinitialized: false });
    const sent = transfer(
      withRepo(withMachine(world, { ...machine, fs }), repo),
      source.id,
      id,
      branches.map(([, oid]) => oid),
      "fetch",
    );
    effects.push(...sent.effects);
    for (const [ref, oid] of branches) {
      effects.push({
        kind: "ref-updated",
        repo: id,
        ref: tracking(ref),
        from: null,
        to: oid,
      });
    }
    let next = sent.world;
    repo = repoOf(next, id);
    const tip = source.refs.get(remoteHead);
    let warning = "";
    if (!branches.length) warning = m.empty();
    else if (!tip) warning = m.remoteHeadMissing();
    else {
      const who = reflogWho(next, machine, repo, time);
      const message = `clone: from ${url}`;
      const originHead = `refs/remotes/${ORIGIN}/HEAD` as RefName;
      repo = appendReflog(
        { ...repo, symrefs: new Map([[originHead, tracking(remoteHead)]]) },
        originHead,
        { old: null, new: tip, who, message },
      );
      const placed = { ...machine, fs };
      const moved = twoWayCheckout(next, repo, placed, tip);
      if (!moved.ok) return moved.refusal;
      const created = updateRef(moved.repo, remoteHead, tip, who, message);
      repo = created.repo;
      next = withMachine(next, { ...placed, fs: moved.fs });
      effects.push(created.effect, ...moved.effects);
    }
    return {
      world: withRepo(next, repo),
      stderr: cloning + warning,
      effects,
    };
  },
});

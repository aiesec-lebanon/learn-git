import { flag, type OptionSpec } from "../cli/options";
import { reflogWho } from "../config/identity";
import { remoteNames, remoteUrl } from "../config/remotes";
import { configValue, setEntry } from "../config/scopes";
import {
  rangeSummary,
  refUpdateLine,
  type RefUpdate,
} from "../format/ref-updates";
import { notSimulated } from "../messages/git";
import { PUSH_USAGE, pushMessages as m } from "../messages/push";
import { networkMessages as net } from "../messages/remote";
import { checkoutMessages } from "../messages/checkout";
import { isAncestor } from "../reachability";
import { branchRef, shortRefName } from "../refs/names";
import { headBranch, updateRef } from "../refs/refs";
import type {
  ConfigFile,
  Effect,
  Machine,
  Oid,
  RefName,
  Repo,
  World,
} from "../types";
import { withEntry, withoutEntry } from "../util/cow";
import { repoOf, withRepo } from "../world/access";
import { connect, transfer } from "../world/network";
import { defaultRemote } from "./fetch";
import { defineCommand, refuse, type CommandResult } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "set-upstream", short: "u", long: "set-upstream" },
  { key: "force", short: "f", long: "force" },
  { key: "delete", short: "d", long: "delete" },
  { key: "quiet", short: "q", long: "quiet" },
  x("verbose", "v"),
  x("all"),
  x("branches"),
  x("mirror"),
  x("tags"),
  x("follow-tags"),
  x("dry-run", "n"),
  x("porcelain"),
  x("prune"),
  x("atomic"),
  x("force-with-lease", undefined, "optional"),
  x("force-if-includes"),
  x("push-option", "o", "required"),
  x("signed", undefined, "optional"),
  x("no-verify"),
  x("recurse-submodules", undefined, "required"),
  x("thin"),
  x("progress"),
];

/** One ref to update on the remote; `src` is null when deleting `dst`. */
type Plan = { readonly src: string | null; readonly dst: string };

type Decision =
  | { readonly kind: "up-to-date"; readonly plan: Plan }
  | {
      readonly kind: "accepted";
      readonly plan: Plan;
      readonly from: Oid | null;
      readonly to: Oid | null;
      readonly line: RefUpdate;
    }
  | {
      readonly kind: "rejected";
      readonly plan: Plan;
      readonly reason: "fetch first" | "non-fast-forward";
      readonly line: RefUpdate;
    };

const failure = (stderr: string, exitCode = 128): CommandResult =>
  refuse("usage", stderr, exitCode);

/** What `git push` with no refspec pushes under `push.default=simple`. */
function defaultPlan(
  world: World,
  machine: Machine,
  repo: Repo,
  remote: string,
): { plans: Plan[]; track: boolean } | CommandResult {
  const current = headBranch(repo);
  if (!current) return failure(m.detached(remote));
  const branch = shortRefName(current);
  const read = (key: string) => configValue(world, machine, repo, key);
  const merge = read(`branch.${branch}.merge`);
  if (read(`branch.${branch}.remote`) === remote && merge) {
    const name = shortRefName(merge);
    if (name !== branch) {
      return failure(m.upstreamNameDiffers(remote, name));
    }
    return { plans: [{ src: branch, dst: branch }], track: false };
  }
  if (read("push.autosetupremote") === "true") {
    return { plans: [{ src: branch, dst: branch }], track: true };
  }
  return refuse("no-upstream", m.noUpstream(branch, remote));
}

function decide(
  world: World,
  repo: Repo,
  hosted: Repo,
  plan: Plan,
  force: boolean,
): Decision {
  const ref = branchRef(plan.dst);
  const old = hosted.refs.get(ref) ?? null;
  const pool = world.objects;
  if (plan.src === null) {
    return {
      kind: "accepted",
      plan,
      from: old,
      to: null,
      line: { code: "-", summary: "[deleted]", from: plan.dst },
    };
  }
  const next = repo.refs.get(branchRef(plan.src)) as Oid;
  const names = { from: plan.src, to: plan.dst };
  if (old === next) return { kind: "up-to-date", plan };
  if (!old) {
    return {
      kind: "accepted",
      plan,
      from: null,
      to: next,
      line: { code: "*", summary: "[new branch]", ...names },
    };
  }
  const local = world.available.get(repo.id);
  const known = local?.has(old) ?? false;
  if (known && isAncestor(pool, old, next)) {
    return {
      kind: "accepted",
      plan,
      from: old,
      to: next,
      line: {
        code: " ",
        summary: rangeSummary(pool, old, next, false),
        ...names,
      },
    };
  }
  if (force) {
    return {
      kind: "accepted",
      plan,
      from: old,
      to: next,
      line: {
        code: "+",
        summary: rangeSummary(pool, old, next, true),
        ...names,
        suffix: " (forced update)",
      },
    };
  }
  const reason = known ? "non-fast-forward" : "fetch first";
  return {
    kind: "rejected",
    plan,
    reason,
    line: {
      code: "!",
      summary: "[rejected]",
      ...names,
      suffix: ` (${reason})`,
    },
  };
}

/** The one hint Git gives for a set of rejections. */
function rejectionHint(
  rejected: readonly Extract<Decision, { kind: "rejected" }>[],
  current: string | null,
): string {
  const behind = rejected.filter((d) => d.reason === "non-fast-forward");
  if (behind.some((d) => d.plan.src === current)) return m.behindCurrent();
  if (behind.length) return m.behindOther();
  return rejected.length ? m.fetchFirst() : "";
}

/** `branch.<src>.remote` and `.merge` for `-u` (and `push.autoSetupRemote`). */
function setUpstreams(
  repo: Repo,
  remote: string,
  plans: readonly Plan[],
): { repo: Repo; stdout: string; effects: Effect[] } {
  let config: ConfigFile = repo.config;
  let stdout = "";
  const effects: Effect[] = [];
  for (const { src, dst } of plans) {
    if (src === null) continue;
    const entries: [string, string][] = [
      [`branch.${src}.remote`, remote],
      [`branch.${src}.merge`, `refs/heads/${dst}`],
    ];
    for (const [key, value] of entries) {
      const from = config.filter((e) => e.key === key).at(-1)?.value ?? null;
      config = setEntry(config, key, value);
      if (from !== value) {
        effects.push({
          kind: "config-changed",
          scope: "local",
          target: repo.id,
          key,
          from,
          to: value,
        });
      }
    }
    stdout += checkoutMessages.setUpToTrack(src, `${remote}/${dst}`);
  }
  return { repo: { ...repo, config }, stdout, effects };
}

export const push = defineCommand({
  name: "push",
  counted: true,
  needsRepo: true,
  usage: PUSH_USAGE,
  options: OPTIONS,
  run: ({ world, machine, repo, options, time }) => {
    const unsupported = refuseUnsimulated("push", options);
    if (unsupported) return unsupported;
    const quiet = flag(options, "quiet");
    const [named, ...specs] = options.args;
    if (named === undefined && !remoteNames(repo).length) {
      return failure(m.noDestination());
    }
    const remote = named ?? defaultRemote(world, machine, repo);
    const url = remoteUrl(world, machine, repo, remote);
    if (url === null) {
      return refuse("no-remote", net.notARepository(remote));
    }
    const current = headBranch(repo);
    const currentName = current ? shortRefName(current) : null;
    let plans: Plan[];
    let track = flag(options, "set-upstream");
    if (flag(options, "delete")) {
      if (!specs.length) return failure(m.deleteNeedsRef());
      plans = specs.map((dst) => ({ src: null, dst }));
    } else if (specs.length) {
      if (specs.some((s) => s.includes(":"))) {
        return refuse(
          "not-simulated",
          notSimulated("push refspecs with ':'"),
          1,
        );
      }
      if (specs.includes("HEAD") && !currentName) {
        return refuse(
          "not-simulated",
          notSimulated("pushing a detached HEAD"),
          1,
        );
      }
      plans = specs.map((s) => {
        const name = s === "HEAD" ? (currentName as string) : s;
        return { src: name, dst: name };
      });
    } else {
      const chosen = defaultPlan(world, machine, repo, remote);
      if (!("plans" in chosen)) return chosen;
      plans = chosen.plans;
      track ||= chosen.track;
    }
    const unknown = plans.find(
      (p) => p.src !== null && !repo.refs.has(branchRef(p.src)),
    );
    if (unknown?.src) {
      return failure(m.noMatch(unknown.src) + m.failed(url), 1);
    }
    const reached = connect(world, url, remote);
    if (!reached.ok) return refuse("no-remote", reached.stderr);
    const hosted = reached.repo;
    const missing = plans.find(
      (p) => p.src === null && !hosted.refs.has(branchRef(p.dst)),
    );
    if (missing) return failure(m.noRemoteRef(missing.dst) + m.failed(url), 1);
    const decisions = plans.map((p) =>
      decide(world, repo, hosted, p, flag(options, "force")),
    );
    const accepted = decisions.filter((d) => d.kind === "accepted");
    const rejected = decisions.filter((d) => d.kind === "rejected");
    const sent = transfer(
      world,
      repo.id,
      hosted.id,
      accepted.flatMap((d) => (d.to ? [d.to] : [])),
      "push",
    );
    let next = sent.world;
    const effects: Effect[] = [...sent.effects];
    let remoteRefs = repoOf(next, hosted.id).refs;
    let local = repoOf(next, repo.id);
    const who = reflogWho(next, machine, local, time);
    for (const d of accepted) {
      const ref = branchRef(d.plan.dst);
      remoteRefs = d.to
        ? withEntry(remoteRefs, ref, d.to)
        : withoutEntry(remoteRefs, ref);
      effects.push({
        kind: "ref-updated",
        repo: hosted.id,
        ref,
        from: d.from,
        to: d.to,
      });
      const tracking = `refs/remotes/${remote}/${d.plan.dst}` as RefName;
      if ((local.refs.get(tracking) ?? null) !== d.to) {
        const moved = updateRef(local, tracking, d.to, who, "update by push");
        local = moved.repo;
        effects.push(moved.effect);
      }
    }
    next = withRepo(next, { ...repoOf(next, hosted.id), refs: remoteRefs });
    let stdout = "";
    if (track) {
      const linked = setUpstreams(
        local,
        remote,
        decisions.filter((d) => d.kind !== "rejected").map((d) => d.plan),
      );
      local = linked.repo;
      stdout = quiet ? "" : linked.stdout;
      effects.push(...linked.effects);
    }
    next = withRepo(next, local);
    const lines = decisions.flatMap((d) =>
      d.kind === "up-to-date" ? [] : [d.line],
    );
    let stderr = "";
    if (!lines.length) stderr = quiet ? "" : m.upToDate();
    else if (!quiet || rejected.length) {
      stderr = m.to(url) + lines.map((l) => refUpdateLine(l)).join("");
    }
    if (rejected.length) {
      stderr += m.failed(url) + rejectionHint(rejected, currentName);
      effects.push({ kind: "refused", code: "push-rejected" });
    }
    return {
      world: next,
      stdout,
      stderr,
      exitCode: rejected.length ? 1 : 0,
      effects,
    };
  },
});

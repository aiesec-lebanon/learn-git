import { hashObject } from "../objects/hash";
import type { TreeFile } from "../objects/tree";
import type {
  Blob,
  Effect,
  HubAction,
  HubInvocation,
  Outcome,
  RepoPath,
  World,
} from "../types";
import { timeAt } from "../world/clock";
import { hostedRepoId } from "../world/network";
import { hubCommit, setHubBranch } from "./commit";
import { refuseHub, type HubContext, type HubResult } from "./result";
import { addHostedRepo } from "./state";
import { GITIGNORE, mitLicense, readmeFor } from "./templates";

const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

function createRepository(
  ctx: HubContext,
  action: Extract<HubAction, { type: "create-repository" }>,
): HubResult {
  const { name } = action;
  if (
    !REPO_NAME.test(name) ||
    name === "." ||
    name === ".." ||
    name.toLowerCase().endsWith(".git")
  ) {
    return refuseHub(
      `"${name}" can't be a repository name. Use letters, digits, ".", "-" and "_".`,
    );
  }
  const fullName = `${ctx.actor}/${name}`;
  const taken = [...(ctx.world.hub?.repos.keys() ?? [])].some(
    (n) => n.toLowerCase() === fullName.toLowerCase(),
  );
  if (taken) return refuseHub(`${fullName} already exists on the Hub.`);
  let world = addHostedRepo(ctx.world, fullName);
  const effects: Effect[] = [
    {
      kind: "hub",
      actor: ctx.actor,
      event: { type: "repository-created", repo: fullName },
    },
  ];
  const contents: [string, string][] = [];
  if (action.readme) contents.push(["README.md", readmeFor(name)]);
  if (action.gitignore)
    contents.push([".gitignore", GITIGNORE[action.gitignore]]);
  if (action.license) {
    const year = new Date(ctx.time * 1000).getUTCFullYear();
    contents.push(["LICENSE", mitLicense(year, ctx.actor)]);
  }
  if (contents.length) {
    const blobs: Blob[] = contents.map(([, content]) => ({
      type: "blob",
      content,
    }));
    const files = new Map<RepoPath, TreeFile>(
      contents.map(([path], i) => [
        path as RepoPath,
        { oid: hashObject(blobs[i] as Blob), mode: "100644" },
      ]),
    );
    const repo = hostedRepoId(fullName);
    const made = hubCommit(world, repo, {
      files,
      blobs,
      parents: [],
      author: ctx.actor,
      message: "Initial commit\n",
      time: ctx.time,
    });
    const moved = setHubBranch(made.world, repo, "main", made.oid);
    world = moved.world;
    effects.push(...made.effects, moved.effect);
  }
  return { ok: true, world, effects };
}

function perform(ctx: HubContext, action: HubAction): HubResult {
  switch (action.type) {
    case "create-repository":
      return createRepository(ctx, action);
    default: {
      const never: never = action.type;
      return never;
    }
  }
}

/** A Hub action in words, for history and the timeline. */
export function hubActionText(action: HubAction): string {
  switch (action.type) {
    case "create-repository":
      return `Hub: create repository ${action.name}`;
    default: {
      const never: never = action.type;
      return never;
    }
  }
}

/**
 * Runs one Hub action as an invocation (ADR-009): the clock ticks as for
 * a command, and a successful action that changes the Hub counts for par.
 */
export function act(world: World, invocation: HubInvocation): Outcome {
  const time = timeAt(world.seq);
  const current: World = { ...world, seq: world.seq + 1, pending: undefined };
  const result = perform(
    { world: current, actor: invocation.actor, time },
    invocation.action,
  );
  const meta = { command: "hub", counted: true };
  if (!result.ok) {
    return {
      world: current,
      output: { stdout: "", stderr: `${result.message}\n`, exitCode: 1 },
      effects: [{ kind: "refused", code: "hub-refused" }],
      notes: [],
      meta,
    };
  }
  return {
    world: result.world,
    output: { stdout: "", stderr: "", exitCode: 0 },
    effects: result.effects,
    notes: [],
    meta,
  };
}

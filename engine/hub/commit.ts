import { resolveIdentity } from "../config/identity";
import { hashObject } from "../objects/hash";
import { buildTree, type TreeFile } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { branchRef } from "../refs/names";
import type {
  Blob,
  Commit,
  Effect,
  Ident,
  Oid,
  RepoId,
  RepoPath,
  World,
} from "../types";
import { withEntry, withoutEntry } from "../util/cow";
import { repoOf, withRepo } from "../world/access";

/** Who commits what the Hub makes on its own (merges, files made on the web). */
export const HUB_IDENT: Ident = { name: "Hub", email: "noreply@hub.test" };

/** An account's commit identity: its machine's Git identity, else a Hub address. */
export function accountIdent(world: World, login: string): Ident {
  const machine = world.machines.get(login);
  const found = machine && resolveIdentity(world, machine, null);
  return found?.ok
    ? found.ident
    : { name: login, email: `${login}@users.noreply.hub.test` };
}

export type HubCommitInput = {
  readonly files: ReadonlyMap<RepoPath, TreeFile>;
  /** New blobs the files use (existing ones may be omitted). */
  readonly blobs: readonly Blob[];
  readonly parents: readonly Oid[];
  readonly author: string;
  readonly message: string;
  readonly time: number;
};

/** Writes a commit the Hub makes into a hosted bare repository. */
export function hubCommit(
  world: World,
  repo: RepoId,
  input: HubCommitInput,
): { world: World; oid: Oid; effects: Effect[] } {
  const { root, trees } = buildTree(input.files);
  const commit: Commit = {
    type: "commit",
    tree: root,
    parents: input.parents,
    author: {
      ...accountIdent(world, input.author),
      time: input.time,
      tz: "+0000",
    },
    committer: { ...HUB_IDENT, time: input.time, tz: "+0000" },
    message: input.message,
  };
  const written = writeObjects(world, repo, [...input.blobs, ...trees, commit]);
  const oid = hashObject(commit);
  const bare = repoOf(written.world, repo);
  return {
    world: withRepo(written.world, {
      ...bare,
      arrival: [...bare.arrival, oid],
    }),
    oid,
    effects: written.effects,
  };
}

/** Moves (or with null deletes) a branch in a hosted repository; bare repositories keep no reflog. */
export function setHubBranch(
  world: World,
  repo: RepoId,
  branch: string,
  to: Oid | null,
): { world: World; effect: Effect } {
  const bare = repoOf(world, repo);
  const ref = branchRef(branch);
  const from = bare.refs.get(ref) ?? null;
  const refs = to
    ? withEntry(bare.refs, ref, to)
    : withoutEntry(bare.refs, ref);
  return {
    world: withRepo(world, { ...bare, refs }),
    effect: { kind: "ref-updated", repo, ref, from, to },
  };
}

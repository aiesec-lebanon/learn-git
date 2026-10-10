import {
  commitSnapshot,
  createWorld,
  discoverRepo,
  firstParentChain,
  machineOf,
  resolveHead,
  rewriteMessage,
  type CommitSnapshot,
  type Oid,
} from "@/engine";
import { recipeSiteHistory } from "@/content/worlds/recipe-site";

const short = (oid: Oid) => oid.slice(0, 7);

/** The three commits the B1.3 stage shows, oldest first. */
function build() {
  const world = createWorld(recipeSiteHistory);
  const repo = discoverRepo(world, machineOf(world));
  const tip = repo && resolveHead(repo);
  if (!tip) throw new Error("The recipe history has no commits");
  const chain = firstParentChain(world.objects, tip);
  return {
    tip,
    pool: world.objects,
    snapshots: chain.map((oid) => commitSnapshot(world.objects, oid)),
  };
}

let history: ReturnType<typeof build> | null = null;
const recipeHistory = () => (history ??= build());

export const historySnapshots = (): readonly CommitSnapshot[] =>
  recipeHistory().snapshots;

export const snapshotLabel = (index: number): string => {
  const all = historySnapshots();
  const s = all[index];
  return s
    ? `Commit ${index + 1} of ${all.length}: ${short(s.oid)} ${s.subject}`
    : "";
};

export type RippleRow = {
  readonly subject: string;
  readonly old: string;
  readonly new: string;
};

/** Every commit's short ID before and after the first commit's message becomes `subject`. */
export function ripple(subject: string): readonly RippleRow[] {
  const { pool, tip, snapshots } = recipeHistory();
  const first = snapshots[0];
  if (!first) return [];
  const text = subject.trim();
  return rewriteMessage(pool, tip, first.oid, `${text}\n`).map((r, i) => ({
    subject: i === 0 ? text : (snapshots[i]?.subject ?? ""),
    old: short(r.old),
    new: short(r.new),
  }));
}

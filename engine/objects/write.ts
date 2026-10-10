import type { Effect, GitObject, Oid, RepoId, World } from "../types";
import { hashObject } from "./hash";
import { addObjects } from "./pool";

/**
 * The one way objects enter the world: appended to the shared pool, with
 * an `object-written` effect for each object the repository did not have.
 */
export function writeObjects(
  world: World,
  repo: RepoId,
  objects: readonly GitObject[],
): { world: World; oids: Oid[]; effects: Effect[] } {
  const { pool, added } = addObjects(world.objects, objects);
  const types = new Map(objects.map((o) => [hashObject(o), o.type]));
  return {
    world: pool === world.objects ? world : { ...world, objects: pool },
    oids: objects.map(hashObject),
    effects: added.map((oid) => ({
      kind: "object-written",
      repo,
      oid,
      type: types.get(oid) ?? "blob",
    })),
  };
}

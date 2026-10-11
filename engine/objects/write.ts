import type { Effect, GitObject, Oid, RepoId, World } from "../types";
import { withEntry } from "../util/cow";
import { hashObject } from "./hash";
import { addObjects } from "./pool";

/** Makes `oids` available in `repo`; returns the ones it did not have. */
export function makeAvailable(
  world: World,
  repo: RepoId,
  oids: readonly Oid[],
): { world: World; added: Oid[] } {
  const have = world.available.get(repo) ?? new Set<Oid>();
  const added = [...new Set(oids)].filter((oid) => !have.has(oid));
  if (!added.length) return { world, added };
  const next = new Set(have);
  for (const oid of added) next.add(oid);
  return {
    world: { ...world, available: withEntry(world.available, repo, next) },
    added,
  };
}

/**
 * The one way objects enter the world: appended to the shared pool and
 * made available in the repository, with an `object-written` effect for
 * each object the repository did not have.
 */
export function writeObjects(
  world: World,
  repo: RepoId,
  objects: readonly GitObject[],
): { world: World; oids: Oid[]; effects: Effect[] } {
  const { pool } = addObjects(world.objects, objects);
  const types = new Map(objects.map((o) => [hashObject(o), o.type]));
  const oids = objects.map(hashObject);
  const pooled = pool === world.objects ? world : { ...world, objects: pool };
  const made = makeAvailable(pooled, repo, oids);
  return {
    world: made.world,
    oids,
    effects: made.added.map((oid) => ({
      kind: "object-written",
      repo,
      oid,
      type: types.get(oid) ?? "blob",
    })),
  };
}

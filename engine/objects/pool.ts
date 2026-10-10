import { invariant } from "../errors";
import type { GitObject, ObjectPool, ObjectType, Oid } from "../types";
import { hashObject } from "./hash";

type ObjectOf<T extends ObjectType> = Extract<GitObject, { type: T }>;

export function readObject<T extends ObjectType>(
  pool: ObjectPool,
  oid: Oid,
  type: T,
): ObjectOf<T> {
  const object = pool.get(oid);
  invariant(object?.type === type, `Expected ${type} ${oid}`);
  return object as ObjectOf<T>;
}

/** Appends objects (the pool never forgets one); returns the IDs that were new. */
export function addObjects(
  pool: ObjectPool,
  objects: readonly GitObject[],
): { pool: ObjectPool; added: readonly Oid[] } {
  const added: Oid[] = [];
  let next: Map<Oid, GitObject> | null = null;
  for (const object of objects) {
    const oid = hashObject(object);
    if (pool.has(oid) || next?.has(oid)) continue;
    next ??= new Map(pool);
    next.set(oid, object);
    added.push(oid);
  }
  return { pool: next ?? pool, added };
}

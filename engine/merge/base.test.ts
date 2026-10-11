import { describe, expect, it } from "vitest";
import { recordedFixtures } from "../test/fixtures";
import { seedWorld } from "../test/replay";
import type { Commit, Oid, RefName } from "../types";
import { ancestorsOf, mergeBases } from "./base";

const fixture = recordedFixtures.find((f) => f.id === "graph/criss");
if (!fixture) throw new Error("graph/criss fixture missing");
const world = seedWorld(fixture);
const repo = [...world.repos.values()][0];
if (!repo) throw new Error("no repo");
const pool = world.objects;
const commit = (oid: Oid) => pool.get(oid) as Commit;
const parent = (oid: Oid) => commit(oid).parents[0] as Oid;
const merged = repo.refs.get("refs/heads/main" as RefName) as Oid;
const topic = repo.refs.get("refs/heads/topic" as RefName) as Oid;

describe("merge bases", () => {
  const m2 = parent(merged);
  const m1 = parent(m2);
  const t1 = parent(parent(topic));

  it("finds the newest shared ancestor once history has merged", () => {
    expect(mergeBases(pool, m2, topic)).toEqual([m1]);
  });

  it("finds the fork point of two plain branches", () => {
    const base = parent(m1);
    expect(mergeBases(pool, m1, t1)).toEqual([base]);
  });

  it("is the older commit when one contains the other", () => {
    expect(mergeBases(pool, m1, merged)).toEqual([m1]);
    expect(ancestorsOf(pool, merged)).toBe(ancestorsOf(pool, merged));
  });
});

import { describeGraph, type Effect, type World } from "@/engine";
import { repoView, type RepoView } from "@/features/graph/view-model";
import { annotate } from "./choreography/annotations";
import { stageFiles, type StageFiles } from "./files";
import { repoPanels, type RepoPanel } from "./multi-repo/model";

/** Everything the stage shows for one state, as plain JSON (built on the server or the client). */
export type StageFrame = {
  readonly files: StageFiles;
  readonly view: RepoView | null;
  /** Origin on the Hub and teammates' clones, when the world has them. */
  readonly panels: readonly RepoPanel[];
  readonly description: string | null;
  /** The effects that led here; the stage animates them. */
  readonly effects: readonly Effect[];
  /** Before → after notes for reduced motion. */
  readonly notes: readonly string[];
};

export function stageFrame(
  world: World,
  effects: readonly Effect[],
): StageFrame {
  const files = stageFiles(world);
  const repo = files.repo ? world.repos.get(files.repo) : undefined;
  return {
    files,
    view: repo ? repoView(world, repo) : null,
    panels: repoPanels(world, repo?.id ?? null),
    description: repo ? describeGraph(world, repo.id) : null,
    effects,
    notes: annotate(effects, world, files.root),
  };
}

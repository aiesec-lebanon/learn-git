"use client";

import { useMemo } from "react";
import { describeGraph, type Session } from "@/engine";
import { CommitGraph } from "@/features/graph/graph";
import { repoView } from "@/features/graph/view-model";
import { Area } from "./area";
import { FileCard } from "./file-card";
import { stageFiles, type FileCard as Card } from "./files";
import { StageBoundary } from "./stage-boundary";
import { useSession } from "./use-session";

function FileList({ files, empty }: { files: readonly Card[]; empty: string }) {
  if (!files.length)
    return <p className="m-0 text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {files.map((f) => (
        <FileCard key={`${f.path}:${f.state}`} file={f} />
      ))}
    </ul>
  );
}

function StageAreas({ session }: { session: Session }) {
  const { world } = useSession(session);
  const files = useMemo(() => stageFiles(world), [world]);
  const repo = files.repo ? world.repos.get(files.repo) : undefined;
  const view = useMemo(
    () => (repo ? repoView(world, repo) : null),
    [world, repo],
  );
  return (
    <div className="grid gap-4">
      <Area title="Repository" hint={repo ? "inside .git" : undefined}>
        {view && repo ? (
          <CommitGraph
            view={view}
            label="Repository"
            describe={() => describeGraph(world, repo.id)}
          />
        ) : (
          <p className="m-0 text-sm text-fg-muted">
            No repository here yet. <code>git init</code> creates one.
          </p>
        )}
      </Area>
      <div className="grid gap-4 sm:grid-cols-2">
        <Area title="Working tree" hint="your files">
          <FileList files={files.worktree} empty="No files." />
        </Area>
        <Area title="Staging area" hint="the next commit">
          {files.index === null ? (
            <p className="m-0 text-sm text-fg-muted">
              Appears with the repository.
            </p>
          ) : (
            <FileList files={files.index} empty="Empty." />
          )}
        </Area>
      </div>
    </div>
  );
}

/** The three-area stage for one sandbox session. */
export function Stage({ session }: { session: Session }) {
  return (
    <StageBoundary session={session}>
      <StageAreas session={session} />
    </StageBoundary>
  );
}

"use client";

import { useMemo } from "react";
import type { Session } from "@/engine";
import { useLessonSession } from "@/features/lesson/lesson-sandbox";
import { FileStateChip } from "@/features/stage/file-card";
import { stageFiles } from "@/features/stage/files";
import { useSession } from "@/features/stage/use-session";
import { stateGroups } from "./pattern-lab.model";

/** Every file in your Your turn sandbox, grouped as untracked, tracked or ignored. */
export function FileStateMap() {
  const session = useLessonSession();
  return session ? <FileStateMapFor session={session} /> : null;
}

function FileStateMapFor({ session }: { session: Session }) {
  const { world } = useSession(session);
  const groups = useMemo(() => stateGroups(stageFiles(world)), [world]);
  if (!groups) return null;
  return (
    <figure className="m-0 grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <figcaption className="font-display font-bold">
        File states in your sandbox
      </figcaption>
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.id}
            aria-label={group.title}
            className="grid content-start gap-1 rounded-sm border border-line p-2"
          >
            <h4 className="m-0 font-display font-bold">
              {group.title} ({group.files.length})
            </h4>
            <ul className="m-0 grid list-none gap-1 p-0 text-sm">
              {group.files.map((file) => (
                <li key={file.path} className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 truncate">
                    <bdi>{file.path}</bdi>
                  </code>
                  <span className="ml-auto flex shrink-0 gap-1">
                    {file.staged && group.id === "tracked" ? (
                      <span className="rounded-xs bg-st-staged-bg px-1.5 text-xs font-semibold text-st-staged">
                        staged
                      </span>
                    ) : null}
                    {file.state &&
                    group.id === "tracked" &&
                    !(file.staged && file.state === "unmodified") ? (
                      <FileStateChip state={file.state} />
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </figure>
  );
}

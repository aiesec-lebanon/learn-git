"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  match,
  narrate,
  type HistoryEntry,
  type MatchReport,
  type TargetSpec,
  type WorldSpec,
} from "@/engine";
import { useAnnounce } from "@/features/announcer/announcer";
import { CommandChips } from "@/features/chips/chips";
import { ConflictResolver } from "@/features/conflict/resolver";
import type { Hints } from "@/content/define";
import { Guide } from "@/features/guide/guide";
import { HintLadder } from "@/features/guide/hint-ladder";
import { progressStore, useProgress } from "@/features/progress/progress";
import type { ResumePointer } from "@/features/progress/schema";
import { ReferenceSheet } from "@/features/reference/reference-sheet";
import { EditorSheet } from "@/features/stage/editor-sheet";
import { Rewind } from "@/features/stage/rewind";
import { sandboxFor } from "@/features/stage/session-registry";
import { Stage } from "@/features/stage/stage";
import { useSession } from "@/features/stage/use-session";
import { WhatHappened } from "@/features/stage/what-happened";
import { Terminal } from "@/features/terminal/terminal";
import { Button } from "@/ui/button";
import { TargetPanel } from "./target-panel";

/** What reaching the target records: the resume point, the finished chapter. */
export type Reached = {
  readonly resume?: ResumePointer;
  readonly finishes?: string;
};

export type SandboxProps = {
  sessionKey: string;
  world: WorldSpec;
  /** Without a target the sandbox is free play: nothing to reach. */
  target?: TargetSpec;
  reached?: Reached;
  hints?: Hints;
  /** A command typed before the sandbox loaded; it runs first. */
  queued: string | null;
  focus: boolean;
};

function YourPath({ history }: { history: readonly HistoryEntry[] }) {
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">
        Your path ({history.length} commands)
      </summary>
      <ol className="m-0 grid gap-2 pl-5">
        {history.map((entry, i) => (
          <li key={i}>
            <code className="font-mono">{entry.text}</code>
            <br />
            <span className="text-fg-muted">
              {narrate(entry.outcome.effects, entry.outcome.world).announcement}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Check({
  report,
  history,
  reached,
}: {
  report: MatchReport;
  history: readonly HistoryEntry[];
  reached: Reached;
}) {
  const [open, setOpen] = useState(false);
  const say = useAnnounce();
  const was = useRef(report.ok);
  useEffect(() => {
    if (report.ok && !was.current) {
      say("Your repository now matches the target.");
      const store = progressStore();
      if (reached.resume) store.setResume(reached.resume);
      if (reached.finishes) store.finishChapter(reached.finishes);
    }
    was.current = report.ok;
  }, [report.ok, say, reached]);

  if (report.ok)
    return (
      <div className="grid gap-2 rounded-sm bg-accent-soft p-3">
        <p className="m-0 font-display text-lg font-semibold">
          Your repository now matches the target.
        </p>
        <YourPath history={history} />
      </div>
    );
  return (
    <div className="grid justify-items-start gap-2">
      <Button aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide differences" : "Show differences"}
      </Button>
      {open ? (
        <ul className="m-0 grid gap-1 pl-5 text-sm">
          {report.differences.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const NOTHING: Reached = {};

/** The live sandbox of a checkpoint or the playground. */
export function Sandbox({
  sessionKey,
  world,
  target,
  reached = NOTHING,
  hints,
  queued,
  focus,
}: SandboxProps) {
  const session = useMemo(
    () => sandboxFor(sessionKey, world),
    [sessionKey, world],
  );
  const { world: now, history } = useSession(session);
  const report = useMemo(
    () => (target ? match(now, target) : null),
    [now, target],
  );
  const { guide } = useProgress().prefs;
  const ran = useRef(false);
  useEffect(() => {
    if (queued && !ran.current) session.run(queued);
    ran.current = true;
  }, [queued, session]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Guide
          session={session}
          verbosity={guide}
          achieved={report?.ok ?? false}
        />
        <Stage session={session} />
        <ConflictResolver session={session} />
      </div>
      <div className="grid content-start gap-4">
        <div className="hidden md:block">
          <Terminal session={session} takeFocus={focus} />
        </div>
        <div className="md:hidden">
          <CommandChips session={session} />
        </div>
        <Rewind session={session} />
        {report && target ? (
          <>
            <Check report={report} history={history} reached={reached} />
            {hints ? <HintLadder session={session} hints={hints} /> : null}
            <TargetPanel target={target} />
          </>
        ) : null}
        <WhatHappened session={session} />
        <EditorSheet session={session} />
        <ReferenceSheet session={session} />
      </div>
    </div>
  );
}

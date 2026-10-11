"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countPar,
  match,
  type HistoryEntry,
  type MatchReport,
  type TargetSpec,
  type WorldSpec,
} from "@/engine";
import { useAnnounce } from "@/features/announcer/announcer";
import { CommandChips } from "@/features/chips/chips";
import { ConflictResolver } from "@/features/conflict/resolver";
import type { Challenge, Hints, ScenarioScene } from "@/content/define";
import { solvedLine } from "@/features/challenge/model";
import { Solved } from "@/features/challenge/solved";
import { Guide } from "@/features/guide/guide";
import { HintLadder } from "@/features/guide/hint-ladder";
import { StageAndHub } from "@/features/hub/hub-and-stage";
import { progressStore, useProgress } from "@/features/progress/progress";
import type { ResumePointer } from "@/features/progress/schema";
import { ReferenceSheet } from "@/features/reference/reference-sheet";
import { ScenarioPanel } from "@/features/scenario/scenario-panel";
import { useActsReached } from "@/features/scenario/use-acts";
import { EditorSheet } from "@/features/stage/editor-sheet";
import { Rewind } from "@/features/stage/rewind";
import { sandboxFor } from "@/features/stage/session-registry";
import { Stage } from "@/features/stage/stage";
import { useSession } from "@/features/stage/use-session";
import { WhatHappened } from "@/features/stage/what-happened";
import { Terminal } from "@/features/terminal/terminal";
import { Button } from "@/ui/button";
import { TargetPanel } from "./target-panel";
import { YourPath } from "./your-path";

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
  /** A scenario: its acts take the place of a single target. */
  scenario?: ScenarioScene;
  /** A puzzle: solving it shows the step count against par; nothing is stored. */
  challenge?: Challenge;
  /** A command typed before the sandbox loaded; it runs first. */
  queued: string | null;
  focus: boolean;
};

const MATCHED = "Your repository now matches the target.";

function Check({
  report,
  history,
  reached,
  challenge,
}: {
  report: MatchReport;
  history: readonly HistoryEntry[];
  reached: Reached;
  challenge?: Challenge;
}) {
  const [open, setOpen] = useState(false);
  const say = useAnnounce();
  const was = useRef(report.ok);
  const done = challenge
    ? solvedLine(countPar(history), challenge.par)
    : MATCHED;
  useEffect(() => {
    if (report.ok && !was.current) {
      say(done);
      const store = progressStore();
      if (reached.resume) store.setResume(reached.resume);
      if (reached.finishes) store.finishChapter(reached.finishes);
    }
    was.current = report.ok;
  }, [report.ok, say, reached, done]);

  if (report.ok)
    return (
      <div className="grid gap-2 rounded-sm bg-accent-soft p-3">
        <p className="m-0 font-display text-lg font-semibold">{done}</p>
        {challenge ? null : <YourPath history={history} />}
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
  scenario,
  challenge,
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
  const acts = useActsReached(scenario, session);
  const resolved = scenario ? acts === scenario.acts.length : false;
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
          verbosity={
            scenario && !resolved && guide === "full" ? "light" : guide
          }
          achieved={report?.ok ?? resolved}
        />
        <StageAndHub session={session} stage={<Stage session={session} />} />
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
        {scenario ? (
          <ScenarioPanel scene={scenario} session={session} reached={acts} />
        ) : null}
        {report && target ? (
          <>
            <Check
              report={report}
              history={history}
              reached={reached}
              challenge={challenge}
            />
            {hints ? <HintLadder session={session} hints={hints} /> : null}
            <TargetPanel target={target} />
          </>
        ) : null}
        <WhatHappened session={session} />
        <EditorSheet session={session} />
        <ReferenceSheet session={session} />
      </div>
      {challenge && report?.ok ? (
        <div className="lg:col-span-2">
          <Solved challenge={challenge} history={history} />
        </div>
      ) : null}
    </div>
  );
}

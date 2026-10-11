import { createWorld, Session, type HistoryEntry } from "@/engine";
import { writeFile } from "@/content/define";
import { INDEX_LATER } from "@/content/worlds/bake-sale";
import { samPushesMeeting, teamRepo } from "@/content/worlds/team-repo";
import { stageFrame, type StageFrame } from "@/features/stage/frame";
import type { GuidePose } from "@/themes/contract";

/** One shot of the home film: what ran, who ran it, the guide's line and the stage after it. */
export type HeroFrame = {
  readonly who: string;
  readonly command: string;
  readonly say: string;
  readonly mood: GuidePose;
  readonly stage: StageFrame;
};

type Shot = Omit<HeroFrame, "stage" | "who"> & {
  readonly who?: string;
  readonly run: (session: Session) => readonly HistoryEntry[];
};

const line = (text: string) => (session: Session) => session.run(text);

const SHOTS: readonly Shot[] = [
  {
    command: "edit index.html",
    run: line(writeFile("index.html", INDEX_LATER)),
    say: "index.html changed in your working tree. Git hasn't saved anything yet.",
    mood: "explaining",
  },
  {
    command: "git add index.html",
    run: line("git add index.html"),
    say: "Staged. Your next commit will save this version of index.html.",
    mood: "explaining",
  },
  {
    command: 'git commit -m "Open until 15:00"',
    run: line('git commit -m "Open until 15:00"'),
    say: "New commit. main moved to it; origin/main still shows where origin was.",
    mood: "explaining",
  },
  {
    who: "Meanwhile, on Sam's laptop",
    command: "git push",
    run: (session) => session.stepActor(),
    say: "Sam pushed to origin. Your repository can't see his commit yet.",
    mood: "explaining",
  },
  {
    command: "git fetch",
    run: line("git fetch"),
    say: "origin/main moved to Sam's commit. Your own main didn't move.",
    mood: "explaining",
  },
  {
    command: "git merge origin/main",
    run: line("git merge origin/main"),
    say: "A merge commit with two parents joins your work and Sam's.",
    mood: "pleased",
  },
  {
    command: "git push",
    run: line("git push"),
    say: "origin's main matches yours now, and origin/main moved to show it.",
    mood: "pleased",
  },
];

const NOW = "Now running";

/** The film, computed at build time: a resting frame, then one frame per shot. */
export function heroFilm(): HeroFrame[] {
  const session = new Session(
    createWorld({
      ...teamRepo,
      actors: [samPushesMeeting({ kind: "after-step", step: 0 })],
    }),
  );
  session.setActorsPaused(true);
  const rest: HeroFrame = {
    who: NOW,
    command: "git status",
    say: "On branch main, up to date with origin/main. Office hours are open.",
    mood: "idle",
    stage: stageFrame(session.getSnapshot().world, []),
  };
  return [
    rest,
    ...SHOTS.map(({ run, who = NOW, ...shot }): HeroFrame => {
      const entries = run(session);
      return {
        ...shot,
        who,
        stage: stageFrame(
          session.getSnapshot().world,
          entries.flatMap((e) => e.outcome.effects),
        ),
      };
    }),
  ];
}

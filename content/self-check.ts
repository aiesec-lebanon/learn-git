import { CHAPTERS, type ChapterId } from "./registry";

/** "What can you already do?" (learning design 2.2): one statement per chapter, all tracks. */
export const SELF_CHECK = [
  {
    track: "Beginner",
    statements: [
      s(
        "b1",
        "I can turn a folder into a repository and commit only some of my changes.",
      ),
      s(
        "b2",
        "I can see exactly what changed, staged and unstaged, and safely unstage or discard changes.",
      ),
      s(
        "b3",
        "I can create and switch branches and explain HEAD and detached HEAD.",
      ),
      s("b4", "I can merge a branch and resolve a simple conflict."),
      s(
        "b5",
        "I can clone, fetch, pull and push, and explain what origin/main is.",
      ),
      s("b6", "I can open a pull request, respond to review and merge it."),
    ],
  },
  {
    track: "Intermediate",
    statements: [
      s(
        "i1",
        "I can amend, reset (soft, mixed, hard) and revert, and I know which is safe after pushing.",
      ),
      s(
        "i2",
        "I can rebase a branch onto main and handle conflicts mid-rebase.",
      ),
      s(
        "i3",
        "I can squash, reorder, reword and split commits with interactive rebase.",
      ),
      s("i4", "I can stash work, stage single hunks and cherry-pick a commit."),
      s(
        "i5",
        "I can contribute through a fork, keep it in sync, and force-push only with a lease.",
      ),
      s(
        "i6",
        "I can review with suggestions, choose a merge method knowing its effect, and work under branch rules and CI.",
      ),
      s(
        "i7",
        "I can find when and why a line changed and recover lost commits with the reflog.",
      ),
    ],
  },
  {
    track: "Pro",
    statements: [
      s(
        "p1",
        "I can read and write objects and refs with plumbing commands and name any commit with revision syntax.",
      ),
      s(
        "p2",
        "I can explain criss-cross merges, and revert a merge and later merge the branch again correctly.",
      ),
      s(
        "p3",
        "I can transplant ranges with --onto and restack dependent branches.",
      ),
      s(
        "p4",
        "I can find a regression with bisect run and trace a function's history.",
      ),
      s(
        "p5",
        "I can use worktrees, partial and sparse clones and submodules, and purge a secret from history.",
      ),
      s("p6", "I can use refspecs, hooks and commit signing."),
      s(
        "p7",
        "I can configure rulesets and merge queues and write hardened Actions workflows.",
      ),
    ],
  },
] as const;

export type Statement = { readonly id: string; readonly text: string };

function s(id: string, text: string): Statement {
  return { id, text };
}

const ALL: readonly Statement[] = SELF_CHECK.flatMap((t) => t.statements);

const isChapter = (id: string): id is ChapterId =>
  CHAPTERS.some((c) => c.id === id);

export type Suggestion =
  /** A chapter that exists: start it, or prove it with its capstone. */
  | {
      readonly kind: "chapter";
      readonly chapter: ChapterId;
      readonly reason: string;
    }
  /** The first gap is in a track that is not written yet. */
  | { readonly kind: "coming-next"; readonly reason: string }
  | { readonly kind: "everything" };

/** The first statement not ticked, with the reason; finished chapters count as ticked. */
export function suggest(
  ticked: ReadonlySet<string>,
  finished: readonly string[] = [],
): Suggestion {
  const gap = ALL.find((st) => !ticked.has(st.id) && !finished.includes(st.id));
  if (!gap) return { kind: "everything" };
  const reason = `You didn't tick: ${gap.text}`;
  return isChapter(gap.id)
    ? { kind: "chapter", chapter: gap.id, reason }
    : { kind: "coming-next", reason };
}

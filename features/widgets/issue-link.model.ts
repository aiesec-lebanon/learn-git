import {
  closingIssues,
  closingMatches,
  defaultBranch,
  type Repo,
  type World,
} from "@/engine";
import { originOnHub } from "./hub-split.model";

/** A piece of a description: plain text, a mention (`#3`) or a closing reference (`Fixes #3`). */
export type Segment = {
  readonly text: string;
  readonly kind: "text" | "mention" | "closes";
  readonly number?: number;
};

const MENTION = /#(\d+)\b/g;

function mentions(text: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(MENTION)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index), kind: "text" });
    out.push({ text: m[0], kind: "mention", number: Number(m[1]) });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), kind: "text" });
  return out;
}

/** The description split so closing references and mentions can be marked. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of closingMatches(text)) {
    out.push(...mentions(text.slice(at, m.start)));
    out.push({
      text: text.slice(m.start, m.end),
      kind: "closes",
      number: m.number,
    });
    at = m.end;
  }
  out.push(...mentions(text.slice(at)));
  return out;
}

/** What merging a pull request with this description into `base` would close. */
export function wouldClose(
  text: string,
  base: string,
  defaultName: string,
): number[] {
  return base === defaultName ? closingIssues(text) : [];
}

export type LinkLine = {
  readonly issue: {
    readonly number: number;
    readonly title: string;
    readonly state: "open" | "closed";
  };
  readonly pull: {
    readonly number: number;
    readonly title: string;
    readonly base: string;
    readonly merged: boolean;
  };
  /** pending: merging will close it; closed: the merge closed it; inert: the pull request targets another branch. */
  readonly status: "pending" | "closed" | "inert";
};

/** Every issue a pull request on origin names with a closing keyword, and what that link does. */
export function linkLines(world: World, repo: Repo): LinkLine[] {
  const name = originOnHub(world, repo);
  const hosted = name ? world.hub?.repos.get(name) : undefined;
  if (!name || !hosted) return [];
  const main = defaultBranch(world, name);
  return hosted.pulls.flatMap((pull) =>
    closingIssues(pull.body).flatMap((number): LinkLine[] => {
      const issue = hosted.issues.find((i) => i.number === number);
      if (!issue) return [];
      const merged = pull.state === "merged";
      const status =
        pull.base !== main ? "inert" : merged ? "closed" : "pending";
      return [
        {
          issue: { number, title: issue.title, state: issue.state },
          pull: {
            number: pull.number,
            title: pull.title,
            base: pull.base,
            merged,
          },
          status,
        },
      ];
    }),
  );
}

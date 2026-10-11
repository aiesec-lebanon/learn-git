import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  compareBranches,
  defaultBranch,
  findPull,
  hubBranches,
  pullCompare,
  pullTimeline,
  type PullRequest,
  type Review,
  type TimelineItem,
} from "@/engine";
import { Icon } from "@/themes/active";
import { Button } from "@/ui/button";
import { DiffView } from "./diff-view";
import { HubMarkdown } from "./markdown";
import { MergeBox, ReviewFiles } from "./pr-review";
import { actOn, at, field, HubLink, Refusal, type HubPageProps } from "./parts";
import { RepoShell } from "./repo-pages";

type RepoProps = HubPageProps & { readonly repo: string };

const STATE_WORD = {
  open: "Open",
  merged: "Merged",
  closed: "Closed",
} as const;

/** Open, Merged or Closed, with its icon. */
export function StateBadge({ state }: { state: PullRequest["state"] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-line-strong bg-surface px-2.5 py-0.5 text-sm font-semibold">
      <Icon name={state === "merged" ? "merged" : "pull"} />
      {STATE_WORD[state]}
    </span>
  );
}

export function PullsPage({ world, repo, go, session }: RepoProps) {
  const pulls = [...(world.hub?.repos.get(repo)?.pulls ?? [])].reverse();
  return (
    <RepoShell repo={repo} tab="pulls" world={world} go={go} session={session}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold">Pull requests</h2>
        <Button variant="primary" onClick={() => go({ page: "compare", repo })}>
          New pull request
        </Button>
      </div>
      {pulls.length ? (
        <ul className="m-0 grid list-none gap-0 rounded-sm border border-line bg-surface p-0">
          {pulls.map((p) => (
            <li
              key={p.number}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-b-0"
            >
              <StateBadge state={p.state} />
              <HubLink go={go} to={{ page: "pull", repo, number: p.number }}>
                <bdi>{p.title}</bdi>
              </HubLink>
              <span className="text-sm text-fg-muted">
                #{p.number} · <bdi>{p.head}</bdi> → <bdi>{p.base}</bdi>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-fg-muted">
          No pull requests yet. Push a branch, then propose merging it.
        </p>
      )}
    </RepoShell>
  );
}

function BranchSelect({
  label,
  value,
  names,
  onPick,
}: {
  label: string;
  value: string;
  names: readonly string[];
  onPick: (name: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className="min-h-11 rounded-sm border-2 border-line-strong bg-surface px-2 text-sm text-fg"
      >
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Mergeable or not, in words (never colour alone). */
export function MergeableLine({ clean }: { clean: boolean }) {
  return (
    <p className="m-0 flex items-center gap-2 text-sm font-semibold">
      <Icon name={clean ? "check" : "alert"} />
      {clean
        ? "Able to merge: no conflicts with the base branch."
        : "This branch has conflicts that must be resolved."}
    </p>
  );
}

/** base ← compare: what the branch adds, and the form that proposes it. */
export function ComparePage({
  world,
  repo,
  go,
  session,
  base: chosenBase,
  head: chosenHead,
}: RepoProps & { base?: string; head?: string }) {
  const id = useId();
  const names = hubBranches(world, repo).map((b) => b.name);
  const base = chosenBase ?? defaultBranch(world, repo);
  const head = chosenHead ?? names.find((n) => n !== base) ?? names[0] ?? base;
  const compared = compareBranches(world, repo, base, head);
  const firstSubject = compared.ok ? compared.view.commits[0]?.subject : "";
  const [title, setTitle] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const pick = (b: string, h: string) => {
    setTitle(null);
    go({ page: "compare", repo, base: b, head: h });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const hosted = world.hub?.repos.get(repo);
    const number =
      (hosted?.pulls.length ?? 0) + (hosted?.issues.length ?? 0) + 1;
    const refused = actOn(session, {
      type: "open-pull-request",
      repo,
      base,
      head,
      title: title ?? firstSubject ?? "",
      body,
    });
    setRefusal(refused);
    if (!refused) go({ page: "pull", repo, number });
  };
  return (
    <RepoShell repo={repo} tab="pulls" world={world} go={go} session={session}>
      <h2 className="m-0 text-lg font-bold">Compare changes</h2>
      <p className="m-0 text-sm text-fg-muted">
        Pick the branch to merge into (base) and the branch with your work
        (compare). The diff starts where they split.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <BranchSelect
          label="Base"
          value={base}
          names={names}
          onPick={(b) => pick(b, head)}
        />
        <span aria-hidden="true" className="pb-3 text-lg">
          ←
        </span>
        <BranchSelect
          label="Compare"
          value={head}
          names={names}
          onPick={(h) => pick(base, h)}
        />
      </div>
      {compared.ok ? (
        <>
          <MergeableLine clean={compared.view.mergeable.kind === "clean"} />
          <form
            onSubmit={submit}
            className="grid gap-3 rounded-sm border border-line bg-surface p-3"
          >
            <div className="grid gap-1">
              <label htmlFor={`${id}-title`} className="font-semibold">
                Title
              </label>
              <input
                id={`${id}-title`}
                value={title ?? firstSubject ?? ""}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
                className={field}
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${id}-body`} className="font-semibold">
                Description
              </label>
              <textarea
                id={`${id}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                aria-describedby={`${id}-hint`}
                className={`${field} py-2`}
              />
              <p id={`${id}-hint`} className="m-0 text-sm text-fg-muted">
                Markdown works here. &ldquo;Fixes #7&rdquo; closes issue 7 when
                this merges into the default branch.
              </p>
            </div>
            <Refusal id={`${id}-refusal`} message={refusal} />
            <div>
              <Button type="submit" variant="primary">
                Create pull request
              </Button>
            </div>
          </form>
          <h3 className="m-0 text-base font-bold">
            {compared.view.commits.length} commit
            {compared.view.commits.length === 1 ? "" : "s"}
          </h3>
          <ol className="m-0 grid gap-1 pl-5 text-sm">
            {compared.view.commits.map((c) => (
              <li key={c.oid}>
                <bdi>{c.subject}</bdi>{" "}
                <code className="text-fg-muted">{c.oid.slice(0, 7)}</code>
              </li>
            ))}
          </ol>
          <DiffView files={compared.view.files} />
        </>
      ) : (
        <p className="m-0 rounded-sm bg-sunk p-3">{compared.message}</p>
      )}
    </RepoShell>
  );
}

const REVIEW_WORDS: Readonly<Record<Review["state"], string>> = {
  commented: "reviewed",
  approved: "approved these changes",
  "changes-requested": "requested changes",
};

function Entry({
  icon,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
      <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-pill border-2 border-line-strong bg-surface">
        <Icon name={icon} />
      </span>
      <div className="grid min-w-0 gap-2">{children}</div>
    </li>
  );
}

function Card({ head, body }: { head: ReactNode; body: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-line bg-surface">
      <p className="m-0 border-b border-line bg-sunk px-3 py-1.5 text-sm">
        {head}
      </p>
      <div className="p-3">
        {body.trim() ? (
          <HubMarkdown text={body} />
        ) : (
          <p className="m-0 text-sm text-fg-muted">No description.</p>
        )}
      </div>
    </div>
  );
}

function TimelineEntry({ item, head }: { item: TimelineItem; head: string }) {
  switch (item.kind) {
    case "opened":
      return (
        <Entry icon="pull">
          <Card
            head={
              <>
                <b>
                  <bdi>{item.author}</bdi>
                </b>{" "}
                opened this {at(item.time)}
              </>
            }
            body={item.body}
          />
        </Entry>
      );
    case "commit":
      return (
        <Entry icon="commit">
          <p className="m-0 text-sm">
            <bdi>{item.author}</bdi> added a commit: <bdi>{item.subject}</bdi>{" "}
            <code className="text-fg-muted">{item.oid.slice(0, 7)}</code>
          </p>
        </Entry>
      );
    case "comment":
      return (
        <Entry icon="comment">
          <Card
            head={
              <>
                <b>
                  <bdi>{item.author}</bdi>
                </b>{" "}
                commented {at(item.time)}
              </>
            }
            body={item.body}
          />
        </Entry>
      );
    case "review":
      return (
        <Entry
          icon={
            item.review.state === "approved"
              ? "check"
              : item.review.state === "changes-requested"
                ? "alert"
                : "comment"
          }
        >
          <p className="m-0 text-sm">
            <b>
              <bdi>{item.review.author}</bdi>
            </b>{" "}
            {REVIEW_WORDS[item.review.state]} {at(item.time)}
          </p>
          {item.review.body.trim() ? (
            <Card head="Review" body={item.review.body} />
          ) : null}
          {item.review.comments.map((c, i) => (
            <Card
              key={i}
              head={
                <>
                  On <bdi className="font-mono">{c.path}</bdi>, line {c.line}
                </>
              }
              body={c.body}
            />
          ))}
        </Entry>
      );
    case "merged":
      return (
        <Entry icon="merged">
          <p className="m-0 text-sm">
            <b>
              <bdi>{item.by}</bdi>
            </b>{" "}
            merged commit <code>{item.commit.slice(0, 7)}</code> {at(item.time)}
          </p>
        </Entry>
      );
    case "branch-deleted":
    case "branch-restored":
      return (
        <Entry icon="branch">
          <p className="m-0 text-sm">
            <b>
              <bdi>{item.by}</bdi>
            </b>{" "}
            {item.kind === "branch-deleted" ? "deleted" : "restored"} the{" "}
            <bdi>{head}</bdi> branch {at(item.time)}
          </p>
        </Entry>
      );
  }
}

/** A conversation comment form for an issue or a pull request. */
export function CommentForm({
  session,
  repo,
  number,
}: HubPageProps & { repo: string; number: number }) {
  const id = useId();
  const [body, setBody] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const refused = actOn(session, { type: "comment", repo, number, body });
    setRefusal(refused);
    if (!refused) setBody("");
  };
  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={id} className="font-semibold">
        Add a comment
      </label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className={`${field} py-2`}
      />
      <Refusal id={`${id}-refusal`} message={refusal} />
      <div>
        <Button type="submit">Comment</Button>
      </div>
    </form>
  );
}

export function PullHeader({
  pull,
  commits,
}: {
  pull: PullRequest;
  commits: number;
}) {
  return (
    <div className="grid gap-2">
      <h2 className="m-0 text-xl font-bold">
        <bdi>{pull.title}</bdi>{" "}
        <span className="font-normal text-fg-muted">#{pull.number}</span>
      </h2>
      <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
        <StateBadge state={pull.state} />
        <span>
          <bdi>{pull.author}</bdi>{" "}
          {pull.state === "merged" ? "merged" : "wants to merge"} {commits}{" "}
          commit{commits === 1 ? "" : "s"} into{" "}
          <code>
            <bdi>{pull.base}</bdi>
          </code>{" "}
          from{" "}
          <code>
            <bdi>{pull.head}</bdi>
          </code>
        </span>
      </p>
    </div>
  );
}

/** The pull request page: header, the Conversation and Files changed tabs. */
export function PullPage({
  world,
  repo,
  go,
  session,
  number,
  tab = "conversation",
}: RepoProps & { number: number; tab?: "conversation" | "files" }) {
  const hosted = world.hub?.repos.get(repo);
  const pull = hosted ? findPull(hosted, number) : null;
  const shell = (body: ReactNode) => (
    <RepoShell repo={repo} tab="pulls" world={world} go={go} session={session}>
      {body}
    </RepoShell>
  );
  if (!pull)
    return shell(
      <p className="m-0">
        {repo} has no pull request #{number}.
      </p>,
    );
  const compared = pullCompare(world, repo, pull);
  return shell(
    <>
      <PullHeader pull={pull} commits={compared?.commits.length ?? 0} />
      <nav
        aria-label="Pull request"
        className="flex gap-1 border-b border-line"
      >
        {(
          [
            ["conversation", "Conversation"],
            ["files", `Files changed ${compared?.files.length ?? 0}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => go({ page: "pull", repo, number, tab: id })}
            className="min-h-11 cursor-pointer border-0 border-b-4 border-transparent bg-transparent px-3 text-sm font-semibold text-fg aria-[current=page]:border-accent"
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "files" ? (
        <ReviewFiles
          world={world}
          session={session}
          go={go}
          repo={repo}
          pull={pull}
        />
      ) : (
        <>
          <ol className="m-0 grid list-none gap-4 p-0">
            {pullTimeline(world, repo, pull).map((item, i) => (
              <TimelineEntry key={i} item={item} head={pull.head} />
            ))}
          </ol>
          <MergeBox
            world={world}
            session={session}
            go={go}
            repo={repo}
            pull={pull}
          />
          <CommentForm
            world={world}
            session={session}
            go={go}
            repo={repo}
            number={number}
          />
        </>
      )}
    </>,
  );
}

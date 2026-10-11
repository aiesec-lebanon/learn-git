import { useId, useState, type FormEvent } from "react";
import {
  HUB_LABELS,
  issueLinks,
  issueTimeline,
  type Issue,
  type IssueEvent,
  type World,
} from "@/engine";
import { Icon } from "@/themes/active";
import { Button } from "@/ui/button";
import { HubMarkdown } from "./markdown";
import { actOn, at, field, HubLink, Refusal, type HubPageProps } from "./parts";
import { CommentForm } from "./pr-pages";
import { RepoShell } from "./repo-pages";

type RepoProps = HubPageProps & { readonly repo: string };

function IssueBadge({ state }: { state: Issue["state"] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border-2 border-line-strong bg-surface px-2.5 py-0.5 text-sm font-semibold">
      <Icon name={state === "open" ? "issue" : "issue-closed"} />
      {state === "open" ? "Open" : "Closed"}
    </span>
  );
}

function Labels({ labels }: { labels: readonly string[] }) {
  if (!labels.length) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
      {labels.map((l) => (
        <li
          key={l}
          className="rounded-pill bg-hl px-2 text-xs font-semibold text-fg"
        >
          {l}
        </li>
      ))}
    </ul>
  );
}

const issuesOf = (world: World, repo: string) =>
  world.hub?.repos.get(repo)?.issues ?? [];

export function IssuesPage({ world, repo, go, session }: RepoProps) {
  const issues = [...issuesOf(world, repo)].reverse();
  return (
    <RepoShell repo={repo} tab="issues" world={world} go={go} session={session}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold">Issues</h2>
        <Button
          variant="primary"
          onClick={() => go({ page: "new-issue", repo })}
        >
          New issue
        </Button>
      </div>
      {issues.length ? (
        <ul className="m-0 grid list-none gap-0 rounded-sm border border-line bg-surface p-0">
          {issues.map((i) => (
            <li
              key={i.number}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-b-0"
            >
              <IssueBadge state={i.state} />
              <HubLink go={go} to={{ page: "issue", repo, number: i.number }}>
                <bdi>{i.title}</bdi>
              </HubLink>
              <span className="text-sm text-fg-muted">#{i.number}</span>
              <Labels labels={i.labels} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-fg-muted">No issues yet.</p>
      )}
    </RepoShell>
  );
}

function LabelBoxes({
  name,
  value,
  onChange,
}: {
  name: string;
  value: readonly string[];
  onChange: (labels: string[]) => void;
}) {
  return (
    <fieldset className="m-0 grid gap-0.5 border-0 p-0">
      <legend className="mb-1 font-semibold">Labels</legend>
      {HUB_LABELS.map((l) => (
        <label key={l} className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            name={name}
            checked={value.includes(l)}
            onChange={(e) =>
              onChange(
                e.target.checked ? [...value, l] : value.filter((v) => v !== l),
              )
            }
            className="size-5"
          />
          {l}
        </label>
      ))}
    </fieldset>
  );
}

function AssigneeSelect({
  id,
  world,
  value,
  onChange,
}: {
  id: string;
  world: World;
  value: string;
  onChange: (login: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="font-semibold">
        Assignee
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      >
        <option value="">Nobody</option>
        {(world.hub?.accounts ?? []).map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NewIssuePage({ world, repo, go, session }: RepoProps) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [assignee, setAssignee] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const hosted = world.hub?.repos.get(repo);
    const number =
      (hosted?.pulls.length ?? 0) + (hosted?.issues.length ?? 0) + 1;
    const refused = actOn(session, {
      type: "open-issue",
      repo,
      title,
      body,
      labels,
      assignee: assignee || null,
    });
    setRefusal(refused);
    if (!refused) go({ page: "issue", repo, number });
  };
  return (
    <RepoShell repo={repo} tab="issues" world={world} go={go} session={session}>
      <form onSubmit={submit} className="grid max-w-xl gap-4">
        <h2 className="m-0 text-lg font-bold">New issue</h2>
        <div className="grid gap-1">
          <label htmlFor={`${id}-title`} className="font-semibold">
            Title
          </label>
          <input
            id={`${id}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
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
            className={`${field} py-2`}
          />
        </div>
        <LabelBoxes name={`${id}-labels`} value={labels} onChange={setLabels} />
        <AssigneeSelect
          id={`${id}-assignee`}
          world={world}
          value={assignee}
          onChange={setAssignee}
        />
        <Refusal id={`${id}-refusal`} message={refusal} />
        <div>
          <Button type="submit" variant="primary">
            Create issue
          </Button>
        </div>
      </form>
    </RepoShell>
  );
}

function eventText(e: IssueEvent): string {
  switch (e.kind) {
    case "closed":
      return e.pull === undefined
        ? `closed this ${at(e.time)}`
        : `closed this with pull request #${e.pull} ${at(e.time)}`;
    case "reopened":
      return `reopened this ${at(e.time)}`;
    case "labeled":
      return e.labels.length
        ? `set the labels to ${e.labels.join(", ")} ${at(e.time)}`
        : `removed the labels ${at(e.time)}`;
    case "assigned":
      return e.assignee === null
        ? `removed the assignee ${at(e.time)}`
        : `assigned ${e.assignee} ${at(e.time)}`;
  }
}

/** Labels and assignee, changed and applied in one go. */
function IssueSettings({
  world,
  session,
  repo,
  issue,
}: HubPageProps & { repo: string; issue: Issue }) {
  const id = useId();
  const [labels, setLabels] = useState<string[]>([...issue.labels]);
  const [assignee, setAssignee] = useState(issue.assignee ?? "");
  const [refusal, setRefusal] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const number = issue.number;
    const changed =
      labels.length !== issue.labels.length ||
      labels.some((l) => !issue.labels.includes(l));
    let refused: string | null = null;
    if (changed)
      refused = actOn(session, { type: "label-issue", repo, number, labels });
    if (!refused && (assignee || null) !== issue.assignee)
      refused = actOn(session, {
        type: "assign-issue",
        repo,
        number,
        assignee: assignee || null,
      });
    setRefusal(refused);
  };
  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-heading`}
      className="grid content-start gap-3 rounded-sm border border-line bg-surface p-3"
    >
      <h3 id={`${id}-heading`} className="m-0 text-base font-bold">
        Labels and assignee
      </h3>
      <LabelBoxes name={`${id}-labels`} value={labels} onChange={setLabels} />
      <AssigneeSelect
        id={`${id}-assignee`}
        world={world}
        value={assignee}
        onChange={setAssignee}
      />
      <Refusal id={`${id}-refusal`} message={refusal} />
      <div>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}

export function IssuePage({
  world,
  repo,
  go,
  session,
  number,
}: RepoProps & { number: number }) {
  const id = useId();
  const issue = issuesOf(world, repo).find((i) => i.number === number);
  const [refusal, setRefusal] = useState<string | null>(null);
  const page = { world, go, session };
  if (!issue)
    return (
      <RepoShell repo={repo} tab="issues" {...page}>
        <p className="m-0">
          {repo} has no issue #{number}.
        </p>
      </RepoShell>
    );
  const links = issueLinks(world, repo, number);
  return (
    <RepoShell repo={repo} tab="issues" {...page}>
      <div className="grid gap-2">
        <h2 className="m-0 text-xl font-bold">
          <bdi>{issue.title}</bdi>{" "}
          <span className="font-normal text-fg-muted">#{issue.number}</span>
        </h2>
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
          <IssueBadge state={issue.state} />
          <span>
            <bdi>{issue.author}</bdi> opened this {at(issue.opened)}
            {issue.assignee ? (
              <>
                {" "}
                · assigned to <bdi>{issue.assignee}</bdi>
              </>
            ) : null}
          </span>
          <Labels labels={issue.labels} />
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid min-w-0 content-start gap-4">
          <div className="rounded-sm border border-line bg-surface p-3">
            {issue.body.trim() ? (
              <HubMarkdown text={issue.body} />
            ) : (
              <p className="m-0 text-sm text-fg-muted">No description.</p>
            )}
          </div>
          {links.length ? (
            <section className="grid gap-1 rounded-sm border border-line bg-sunk p-3 text-sm">
              <h3 className="m-0 text-base font-bold">Linked pull requests</h3>
              <ul className="m-0 grid gap-1 pl-5">
                {links.map((l) => (
                  <li key={l.number}>
                    <HubLink
                      go={go}
                      to={{ page: "pull", repo, number: l.number }}
                    >
                      #{l.number} <bdi>{l.title}</bdi>
                    </HubLink>{" "}
                    ({l.state}):{" "}
                    {l.closes
                      ? l.state === "merged"
                        ? "it closed this issue."
                        : "merging it closes this issue."
                      : "it targets another branch, so it won't close this issue."}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <ol className="m-0 grid list-none gap-3 p-0">
            {issueTimeline(issue).map((item, i) => (
              <li key={i} className="text-sm">
                {item.kind === "comment" ? (
                  <div className="rounded-sm border border-line bg-surface">
                    <p className="m-0 border-b border-line bg-sunk px-3 py-1.5">
                      <b>
                        <bdi>{item.comment.author}</bdi>
                      </b>{" "}
                      commented {at(item.comment.time)}
                    </p>
                    <div className="p-3">
                      <HubMarkdown text={item.comment.body} />
                    </div>
                  </div>
                ) : (
                  <p className="m-0 flex items-center gap-2">
                    <Icon
                      name={
                        item.event.kind === "closed" ? "issue-closed" : "issue"
                      }
                    />
                    <span>
                      <b>
                        <bdi>{item.event.by}</bdi>
                      </b>{" "}
                      {eventText(item.event)}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ol>
          <Refusal id={`${id}-refusal`} message={refusal} />
          <div>
            <Button
              onClick={() =>
                setRefusal(
                  actOn(session, {
                    type:
                      issue.state === "open" ? "close-issue" : "reopen-issue",
                    repo,
                    number,
                  }),
                )
              }
            >
              {issue.state === "open" ? "Close issue" : "Reopen issue"}
            </Button>
          </div>
          <CommentForm {...page} repo={repo} number={number} />
        </div>
        <IssueSettings
          key={`${issue.labels.join()}|${issue.assignee ?? ""}`}
          {...page}
          repo={repo}
          issue={issue}
        />
      </div>
    </RepoShell>
  );
}

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  cloneUrl,
  defaultBranch,
  hubBranches,
  hubCommitPage,
  hubCommits,
  hubFile,
  hubTree,
  resolveHubRevision,
  type GitignoreTemplate,
  type Oid,
  type World,
} from "@/engine";
import { Icon } from "@/themes/active";
import { Button } from "@/ui/button";
import { DiffView } from "./diff-view";
import type { HubLocation } from "./location";
import { HubMarkdown } from "./markdown";
import { actOn, at, field, HubLink, Refusal, type HubPageProps } from "./parts";

type RepoProps = HubPageProps & { readonly repo: string };

const TABS = [
  ["code", "Code", "file"],
  ["issues", "Issues", "issue"],
  ["pulls", "Pull requests", "pull"],
  ["branches", "Branches", "branch"],
  ["commits", "Commits", "commit"],
] as const;

type Tab = (typeof TABS)[number][0];

const counts = (world: World, repo: string): Partial<Record<Tab, number>> => {
  const hosted = world.hub?.repos.get(repo);
  return {
    issues: hosted?.issues.filter((i) => i.state === "open").length,
    pulls: hosted?.pulls.filter((p) => p.state === "open").length,
  };
};

/** A repository's header and its section links; on phones the links scroll sideways. */
export function RepoShell({
  repo,
  tab,
  world,
  go,
  children,
}: RepoProps & { tab: Tab; children: ReactNode }) {
  const n = counts(world, repo);
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 border-b-2 border-line-strong pb-2">
        <p className="m-0 flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="repo" className="size-5 shrink-0" />
          <bdi>{repo}</bdi>
        </p>
        <nav aria-label="Repository" className="-mx-1 overflow-x-auto">
          <ul className="m-0 flex list-none gap-1 p-1">
            {TABS.map(([id, label, icon]) => (
              <li key={id}>
                <button
                  type="button"
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() =>
                    go({
                      page: id === "code" ? "code" : id,
                      repo,
                    } as HubLocation)
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm border-2 border-transparent bg-transparent px-3 text-sm font-semibold whitespace-nowrap text-fg hover:border-line-strong aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft"
                >
                  <Icon name={icon} />
                  {label}
                  {n[id] ? (
                    <span className="rounded-pill bg-sunk px-1.5 text-xs">
                      {n[id]}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {children}
    </div>
  );
}

/** The address to clone, with the commands that connect an existing repository. */
function ClonePanel({ repo, empty }: { repo: string; empty: boolean }) {
  const id = useId();
  const url = cloneUrl(repo);
  return (
    <section
      aria-labelledby={id}
      className="grid gap-2 rounded-sm border border-line bg-sunk p-3"
    >
      <h3 id={id} className="m-0 text-base font-bold">
        {empty ? "Quick setup" : "Clone"}
      </h3>
      <p className="m-0 text-sm">
        HTTPS address: <code className="break-all">{url}</code>
      </p>
      {empty ? (
        <>
          <p className="m-0 text-sm">
            This repository is empty. To publish a repository you already have,
            run in its folder:
          </p>
          <pre className="m-0 overflow-x-auto rounded-xs bg-surface p-2 text-sm">
            {`git remote add origin ${url}\ngit push -u origin main`}
          </pre>
        </>
      ) : (
        <p className="m-0 text-sm">
          <code className="break-all">git clone {url}</code>
        </p>
      )}
    </section>
  );
}

function BranchPicker({
  world,
  repo,
  value,
  onPick,
}: {
  world: World;
  repo: string;
  value: string;
  onPick: (branch: string) => void;
}) {
  const id = useId();
  const branches = hubBranches(world, repo);
  const known = branches.some((b) => b.name === value);
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-semibold"
      >
        <Icon name="branch" />
        Branch
      </label>
      <select
        id={id}
        value={known ? value : ""}
        onChange={(e) => onPick(e.target.value)}
        className="min-h-11 rounded-sm border-2 border-line-strong bg-surface px-2 text-sm text-fg"
      >
        {known ? null : <option value="">{value.slice(0, 7)}</option>}
        {branches.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const crumbs = (path: string) =>
  path
    ? path.split("/").map((name, i, all) => ({
        name,
        path: all.slice(0, i + 1).join("/"),
      }))
    : [];

/** The Code tab: a folder or a file at a branch or commit, the README, the clone panel. */
export function CodePage({
  world,
  repo,
  go,
  session,
  refName,
  path = "",
  file = false,
}: RepoProps & { refName?: string; path?: string; file?: boolean }) {
  const ref = refName ?? defaultBranch(world, repo);
  const commit = resolveHubRevision(world, repo, ref);
  const empty = hubBranches(world, repo).length === 0;
  const shell = (body: ReactNode) => (
    <RepoShell repo={repo} tab="code" world={world} go={go} session={session}>
      {body}
    </RepoShell>
  );
  if (empty) return shell(<ClonePanel repo={repo} empty />);
  if (!commit)
    return shell(
      <p className="m-0">
        {repo} has no branch or commit named <bdi>{ref}</bdi>.
      </p>,
    );
  const to = (p: string, isFile: boolean): HubLocation => ({
    page: "code",
    repo,
    ref,
    path: p,
    file: isFile,
  });
  const history = hubCommits(world, repo, commit);
  const content = file ? hubFile(world, commit, path) : null;
  const tree = file ? null : hubTree(world, commit, path);
  return shell(
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <BranchPicker
          world={world}
          repo={repo}
          value={ref}
          onPick={(b) => go({ page: "code", repo, ref: b })}
        />
        <HubLink go={go} to={{ page: "commits", repo, ref }}>
          {history.length} commit{history.length === 1 ? "" : "s"}
        </HubLink>
      </div>
      <nav aria-label="Folder path" className="text-sm">
        <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
          <li>
            <HubLink go={go} to={to("", false)} current={!path}>
              {repo.split("/")[1]}
            </HubLink>
          </li>
          {crumbs(path).map((c) => (
            <li key={c.path}>
              <span aria-hidden="true">/ </span>
              <HubLink go={go} to={to(c.path, false)} current={c.path === path}>
                <bdi>{c.name}</bdi>
              </HubLink>
            </li>
          ))}
        </ol>
      </nav>
      {file ? (
        content === null ? (
          <p className="m-0">
            No file named <bdi>{path}</bdi> here.
          </p>
        ) : (
          <pre className="m-0 overflow-x-auto rounded-sm border border-line bg-surface p-3 text-sm">
            <bdi>{content}</bdi>
          </pre>
        )
      ) : (
        <>
          <ul className="m-0 grid list-none gap-0 rounded-sm border border-line bg-surface p-0">
            {tree?.entries.map((e) => (
              <li
                key={e.path}
                className="flex min-h-11 items-center gap-2 border-b border-line px-3 last:border-b-0"
              >
                <Icon name={e.kind === "dir" ? "folder" : "file"} />
                <HubLink go={go} to={to(e.path, e.kind === "file")}>
                  <bdi>{e.name}</bdi>
                </HubLink>
                <span className="sr-only">
                  {e.kind === "dir" ? "(folder)" : "(file)"}
                </span>
              </li>
            ))}
          </ul>
          {tree?.readme ? (
            <section
              aria-label={tree.readme.path}
              className="rounded-sm border border-line bg-surface p-4"
            >
              <HubMarkdown text={tree.readme.content} />
            </section>
          ) : null}
        </>
      )}
      <ClonePanel repo={repo} empty={false} />
    </>,
  );
}

export function BranchesPage({ world, repo, go, session }: RepoProps) {
  const branches = hubBranches(world, repo);
  return (
    <RepoShell
      repo={repo}
      tab="branches"
      world={world}
      go={go}
      session={session}
    >
      <h2 className="m-0 text-lg font-bold">Branches</h2>
      {branches.length ? (
        <ul className="m-0 grid list-none gap-0 rounded-sm border border-line bg-surface p-0">
          {branches.map((b) => (
            <li
              key={b.name}
              className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-b-0"
            >
              <Icon name="branch" />
              <HubLink go={go} to={{ page: "code", repo, ref: b.name }}>
                <bdi>{b.name}</bdi>
              </HubLink>
              {b.isDefault ? (
                <span className="rounded-pill bg-accent-soft px-2 text-xs font-semibold">
                  default
                </span>
              ) : (
                <span className="text-sm text-fg-muted">
                  {b.ahead} ahead · {b.behind} behind
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-fg-muted">No branches yet: push one.</p>
      )}
    </RepoShell>
  );
}

export function CommitsPage({
  world,
  repo,
  go,
  session,
  refName,
}: RepoProps & { refName?: string }) {
  const ref = refName ?? defaultBranch(world, repo);
  const tip = resolveHubRevision(world, repo, ref);
  return (
    <RepoShell
      repo={repo}
      tab="commits"
      world={world}
      go={go}
      session={session}
    >
      {tip ? (
        <BranchPicker
          world={world}
          repo={repo}
          value={ref}
          onPick={(b) => go({ page: "commits", repo, ref: b })}
        />
      ) : null}
      <h2 className="m-0 text-lg font-bold">
        Commits on <bdi>{ref}</bdi>
      </h2>
      {tip ? (
        <ol className="m-0 grid list-none gap-0 rounded-sm border border-line bg-surface p-0">
          {hubCommits(world, repo, tip).map((c) => (
            <li
              key={c.oid}
              className="grid gap-0.5 border-b border-line px-3 py-2 last:border-b-0"
            >
              <HubLink go={go} to={{ page: "commit", repo, oid: c.oid }}>
                <bdi>{c.subject}</bdi>
              </HubLink>
              <span className="text-sm text-fg-muted">
                <code>{c.oid.slice(0, 7)}</code> · <bdi>{c.author.name}</bdi>{" "}
                {at(c.author.time)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-fg-muted">No commits here yet.</p>
      )}
    </RepoShell>
  );
}

export function CommitPage({
  world,
  repo,
  go,
  session,
  oid,
}: RepoProps & { oid: string }) {
  const known = resolveHubRevision(world, repo, oid);
  const page = known ? hubCommitPage(world, known) : null;
  return (
    <RepoShell
      repo={repo}
      tab="commits"
      world={world}
      go={go}
      session={session}
    >
      {page ? (
        <>
          <h2 className="m-0 text-lg font-bold">
            <bdi>{page.message.split("\n")[0]}</bdi>
          </h2>
          <p className="m-0 text-sm text-fg-muted">
            <code>{page.oid}</code>
            <br />
            <bdi>{page.author.name}</bdi> {at(page.author.time)}
            {page.committer.name !== page.author.name ? (
              <>
                {" "}
                · committed by <bdi>{page.committer.name}</bdi>
              </>
            ) : null}
          </p>
          <p className="m-0 flex flex-wrap gap-2 text-sm">
            {page.parents.length ? (
              <>
                {page.parents.length > 1 ? "Parents:" : "Parent:"}
                {page.parents.map((p: Oid) => (
                  <HubLink
                    key={p}
                    go={go}
                    to={{ page: "commit", repo, oid: p }}
                  >
                    <code>{p.slice(0, 7)}</code>
                  </HubLink>
                ))}
              </>
            ) : (
              "The first commit: no parent."
            )}
          </p>
          <DiffView files={page.files} />
        </>
      ) : (
        <p className="m-0">
          {repo} has no commit {oid.slice(0, 7)}.
        </p>
      )}
    </RepoShell>
  );
}

/** The Hub's start page: your repositories and the New repository button. */
export function HubHome({ world, go }: HubPageProps) {
  const repos = [...(world.hub?.repos.keys() ?? [])];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold">Repositories</h2>
        <Button variant="primary" onClick={() => go({ page: "new" })}>
          New repository
        </Button>
      </div>
      {repos.length ? (
        <ul className="m-0 grid list-none gap-1 p-0">
          {repos.map((r) => (
            <li key={r} className="flex min-h-11 items-center gap-2">
              <Icon name="repo" />
              <HubLink go={go} to={{ page: "code", repo: r }}>
                <bdi>{r}</bdi>
              </HubLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-fg-muted">No repositories yet.</p>
      )}
    </div>
  );
}

const GITIGNORES: readonly [GitignoreTemplate | "", string][] = [
  ["", "None"],
  ["node", "Node"],
  ["python", "Python"],
];

/** The New repository form: name, README, .gitignore and license. */
export function NewRepoPage({ session, go }: HubPageProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [readme, setReadme] = useState(false);
  const [gitignore, setGitignore] = useState<GitignoreTemplate | "">("");
  const [license, setLicense] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const refused = actOn(session, {
      type: "create-repository",
      name,
      ...(readme ? { readme } : {}),
      ...(gitignore ? { gitignore } : {}),
      ...(license ? { license: "mit" as const } : {}),
    });
    setRefusal(refused);
    if (!refused) go({ page: "code", repo: `you/${name}` });
  };
  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <h2 className="m-0 text-lg font-bold">Create a new repository</h2>
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="font-semibold">
          Repository name
        </label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">you /</span>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
            aria-describedby={refusal ? `${id}-refusal` : undefined}
            className={field}
          />
        </div>
      </div>
      <fieldset className="m-0 grid gap-3 rounded-sm border border-line p-3">
        <legend className="px-1 font-semibold">Start with</legend>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={readme}
            onChange={(e) => setReadme(e.target.checked)}
            className="size-5"
          />
          Add a README
        </label>
        <div className="grid gap-1">
          <label htmlFor={`${id}-ignore`}>.gitignore template</label>
          <select
            id={`${id}-ignore`}
            value={gitignore}
            onChange={(e) =>
              setGitignore(e.target.value as GitignoreTemplate | "")
            }
            className={field}
          >
            {GITIGNORES.map(([value, label]) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={license}
            onChange={(e) => setLicense(e.target.checked)}
            className="size-5"
          />
          Add the MIT License
        </label>
        <p className="m-0 text-sm text-fg-muted">
          Any of these makes a first commit on the Hub. If you already have
          commits on your machine, start empty and push them.
        </p>
      </fieldset>
      <Refusal id={`${id}-refusal`} message={refusal} />
      <div>
        <Button type="submit" variant="primary">
          Create repository
        </Button>
      </div>
    </form>
  );
}

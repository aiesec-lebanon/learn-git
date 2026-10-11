import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  hubBranches,
  mergeBlockers,
  pullCompare,
  type DiffLineView,
  type FileDiffView,
  type LineComment,
  type PullRequest,
  type ReviewState,
} from "@/engine";
import { Icon } from "@/themes/active";
import { Button } from "@/ui/button";
import { DiffView } from "./diff-view";
import { HubMarkdown } from "./markdown";
import { actOn, field, Refusal, type HubPageProps } from "./parts";

type PullProps = HubPageProps & {
  readonly repo: string;
  readonly pull: PullRequest;
};

const VERDICTS: readonly [ReviewState, string, string][] = [
  ["commented", "Comment", "General feedback, no verdict."],
  ["approved", "Approve", "These changes can merge."],
  ["changes-requested", "Request changes", "Something must change first."],
];

function LineForm({
  file,
  line,
  onAdd,
  onCancel,
}: {
  file: string;
  line: number;
  onAdd: (body: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => box.current?.focus(), []);
  return (
    <div className="mt-2 grid gap-2 font-sans">
      <label htmlFor={id} className="text-sm font-semibold">
        Comment on line {line} of <bdi>{file}</bdi>
      </label>
      <textarea
        id={id}
        ref={box}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        className={`${field} py-2`}
      />
      <div className="flex gap-2">
        <Button onClick={() => body.trim() && onAdd(body)}>
          Add to review
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Files changed: the diff with line comments, and the review form. */
export function ReviewFiles({ world, session, repo, pull }: PullProps) {
  const id = useId();
  const compared = pullCompare(world, repo, pull);
  const [pending, setPending] = useState<LineComment[]>([]);
  const [open, setOpen] = useState<{ path: string; line: number } | null>(null);
  const [verdict, setVerdict] = useState<ReviewState>("commented");
  const [body, setBody] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const editable = pull.state === "open";
  const posted = pull.reviews.flatMap((r) =>
    r.comments.map((c) => ({ ...c, author: r.author })),
  );
  const lineExtra = (file: FileDiffView, line: DiffLineView) => {
    if (line.new === null) return null;
    const here = (c: LineComment) =>
      c.path === file.path && c.line === line.new;
    const shown: (LineComment & { author: string | null })[] = [
      ...posted.filter(here),
      ...pending.filter(here).map((c) => ({ ...c, author: null })),
    ];
    const isOpen = open?.path === file.path && open.line === line.new;
    return (
      <>
        {editable && !isOpen ? (
          <button
            type="button"
            onClick={() => setOpen({ path: file.path, line: line.new ?? 0 })}
            aria-label={`Comment on line ${line.new} of ${file.path}`}
            className="ml-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-xs border border-line-strong bg-surface align-middle text-fg"
          >
            <Icon name="comment" className="size-3.5" />
          </button>
        ) : null}
        {shown.map((c, i) => (
          <div
            key={i}
            className="mt-2 grid gap-1 rounded-xs border border-line bg-surface p-2 font-sans whitespace-normal"
          >
            <p className="m-0 text-xs text-fg-muted">
              {c.author === null ? (
                "Your pending comment"
              ) : (
                <bdi>{c.author}</bdi>
              )}
            </p>
            <HubMarkdown text={c.body} />
          </div>
        ))}
        {isOpen ? (
          <LineForm
            file={file.path}
            line={line.new}
            onCancel={() => setOpen(null)}
            onAdd={(text) => {
              setPending([
                ...pending,
                { path: file.path, line: line.new ?? 0, body: text },
              ]);
              setOpen(null);
            }}
          />
        ) : null}
      </>
    );
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const refused = actOn(session, {
      type: "review",
      repo,
      number: pull.number,
      state: verdict,
      body,
      comments: pending,
    });
    setRefusal(refused);
    if (refused) return;
    setPending([]);
    setBody("");
  };
  return (
    <div className="grid gap-4">
      {editable ? (
        <form
          onSubmit={submit}
          className="grid gap-3 rounded-sm border border-line bg-surface p-3"
        >
          <h3 className="m-0 text-base font-bold">Review changes</h3>
          <p className="m-0 text-sm text-fg-muted">
            {pending.length
              ? `${pending.length} line comment${pending.length === 1 ? "" : "s"} waiting in this review.`
              : "Use the comment buttons on the lines below to comment on a line."}
          </p>
          <div className="grid gap-1">
            <label htmlFor={`${id}-body`} className="font-semibold">
              Review summary
            </label>
            <textarea
              id={`${id}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className={`${field} py-2`}
            />
          </div>
          <fieldset className="m-0 grid gap-1 border-0 p-0">
            <legend className="mb-1 font-semibold">Your verdict</legend>
            {VERDICTS.map(([value, label, hint]) => (
              <label key={value} className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-verdict`}
                  value={value}
                  checked={verdict === value}
                  onChange={() => setVerdict(value)}
                  className="size-5"
                />
                <span>
                  <b>{label}</b>{" "}
                  <span className="text-sm text-fg-muted">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Refusal id={`${id}-refusal`} message={refusal} />
          <div>
            <Button type="submit" variant="primary">
              Submit review
            </Button>
          </div>
        </form>
      ) : null}
      <DiffView files={compared?.files ?? []} lineExtra={lineExtra} />
    </div>
  );
}

/** Whether it can merge and why not; the merge button; then delete or restore the branch. */
export function MergeBox({ world, session, repo, pull }: PullProps) {
  const id = useId();
  const [refusal, setRefusal] = useState<string | null>(null);
  const run = (
    type: "merge-pull-request" | "delete-branch" | "restore-branch",
  ) => setRefusal(actOn(session, { type, repo, number: pull.number }));
  const branchExists = hubBranches(world, repo).some(
    (b) => b.name === pull.head,
  );
  if (pull.state === "merged") {
    return (
      <section
        aria-labelledby={id}
        className="grid gap-2 rounded-sm border-2 border-line-strong bg-surface p-3"
      >
        <h3 id={id} className="m-0 flex items-center gap-2 text-base font-bold">
          <Icon name="merged" />
          Pull request merged
        </h3>
        <p className="m-0 text-sm">
          {branchExists ? (
            <>
              The <bdi>{pull.head}</bdi> branch can go: its commits are in{" "}
              <bdi>{pull.base}</bdi> now.
            </>
          ) : (
            <>
              The <bdi>{pull.head}</bdi> branch was deleted. Restoring it puts
              it back where it was.
            </>
          )}
        </p>
        <Refusal id={`${id}-refusal`} message={refusal} />
        <div>
          <Button
            onClick={() =>
              run(branchExists ? "delete-branch" : "restore-branch")
            }
          >
            {branchExists ? "Delete branch" : "Restore branch"}
          </Button>
        </div>
      </section>
    );
  }
  const blockers = mergeBlockers(world, repo, pull);
  return (
    <section
      aria-labelledby={id}
      className="grid gap-2 rounded-sm border-2 border-line-strong bg-surface p-3"
    >
      <h3 id={id} className="m-0 flex items-center gap-2 text-base font-bold">
        <Icon name={blockers.length ? "alert" : "check"} />
        {blockers.length ? "Merging is blocked" : "Ready to merge"}
      </h3>
      {blockers.length ? (
        <ul className="m-0 grid gap-1 pl-5 text-sm">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm">
          No conflicts with <bdi>{pull.base}</bdi>. Merging adds a merge commit
          on the Hub only; your clone sees it after a pull.
        </p>
      )}
      <Refusal id={`${id}-refusal`} message={refusal} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          aria-disabled={blockers.length > 0}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          onClick={() =>
            blockers.length ? undefined : run("merge-pull-request")
          }
        >
          Merge pull request
        </Button>
        <span className="text-sm text-fg-muted">
          Method: Create a merge commit
        </span>
      </div>
    </section>
  );
}

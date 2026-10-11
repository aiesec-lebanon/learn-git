import type { WouldLose as Found } from "./counters.model";

/** The commits a forced push would remove from the remote, in plain words. */
export function WouldLoseView({ found }: { found: Found | null }) {
  if (!found) return null;
  const { remote, branch, lost } = found;
  const n = lost.length;
  return (
    <figure className="m-0 grid gap-2 rounded-sm border-2 border-dashed border-st-conflict bg-st-conflict-bg p-3">
      <figcaption className="text-sm">
        {n === 0
          ? `${remote} has nothing on ${branch} that your branch lacks: a push would only add commits.`
          : `${remote}'s ${branch} has ${n} commit${n === 1 ? "" : "s"} your branch does not. Forcing this push would remove ${n === 1 ? "it" : "them"} from ${remote}:`}
      </figcaption>
      {n ? (
        <ul className="m-0 grid list-none gap-1 p-0 text-sm">
          {lost.map((c) => (
            <li key={c.oid} className="flex flex-wrap gap-x-2">
              <code>{c.short}</code>
              <bdi>{c.subject}</bdi>
              <span className="text-fg-muted">
                by <bdi>{c.author}</bdi>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {n ? (
        <p className="m-0 text-sm">
          Bring {n === 1 ? "it" : "them"} in first with <code>git pull</code>,
          then push again.
        </p>
      ) : null}
    </figure>
  );
}

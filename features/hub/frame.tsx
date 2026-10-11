"use client";

import { useEffect, useRef } from "react";
import type { Session, World } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import { Icon } from "@/themes/active";
import {
  addressOf,
  navigatorFor,
  useHubNav,
  type HubLocation,
} from "./location";
import type { HubPageProps } from "./parts";
import { ComparePage, PullPage, PullsPage } from "./pr-pages";
import {
  BranchesPage,
  CodePage,
  CommitPage,
  CommitsPage,
  HubHome,
  NewRepoPage,
  RepoShell,
} from "./repo-pages";

/** Where the Hub opens: the only repository, else the list. */
function startAt(world: World): HubLocation {
  const repos = [...(world.hub?.repos.keys() ?? [])];
  return repos.length === 1 && repos[0]
    ? { page: "code", repo: repos[0] }
    : { page: "home" };
}

function HubPage({ at, ...props }: HubPageProps & { at: HubLocation }) {
  if (at.page === "home") return <HubHome {...props} />;
  if (at.page === "new") return <NewRepoPage {...props} />;
  if (!props.world.hub?.repos.has(at.repo))
    return (
      <p className="m-0">
        The Hub has no repository <bdi>{at.repo}</bdi> (yet, or any more).
      </p>
    );
  const repo = { ...props, repo: at.repo };
  switch (at.page) {
    case "code":
      return (
        <CodePage
          {...repo}
          {...(at.ref ? { refName: at.ref } : {})}
          {...(at.path ? { path: at.path } : {})}
          file={at.file ?? false}
        />
      );
    case "branches":
      return <BranchesPage {...repo} />;
    case "commits":
      return <CommitsPage {...repo} {...(at.ref ? { refName: at.ref } : {})} />;
    case "commit":
      return <CommitPage {...repo} oid={at.oid} />;
    case "pulls":
      return <PullsPage {...repo} />;
    case "compare":
      return (
        <ComparePage
          {...repo}
          {...(at.base ? { base: at.base } : {})}
          {...(at.head ? { head: at.head } : {})}
        />
      );
    case "pull":
      return (
        <PullPage {...repo} number={at.number} tab={at.tab ?? "conversation"} />
      );
    default:
      return (
        <RepoShell {...repo} tab="issues">
          <p className="m-0 text-fg-muted">Nothing here yet.</p>
        </RepoShell>
      );
  }
}

function NavButton({
  label,
  icon,
  enabled,
  onPress,
}: {
  label: string;
  icon: "back" | "forward";
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={!enabled}
      onClick={enabled ? onPress : undefined}
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-transparent bg-transparent text-fg hover:border-line-strong aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
    >
      <Icon name={icon} className="size-5" />
    </button>
  );
}

/**
 * The Hub in a simulated browser window (`hub.test`, a reserved name, so
 * nothing real is implied). Its back and forward buttons move inside the
 * sandbox; the site's own history is untouched.
 */
export function HubFrame({ session }: { session: Session }) {
  const { world } = useSession(session);
  const nav = navigatorFor(session, startAt(world));
  const { at, canBack, canForward } = useHubNav(nav);
  const page = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    page.current?.focus();
  }, [at]);

  return (
    <section
      aria-label="The Hub, a simulated hosting site"
      className="min-w-0 overflow-hidden rounded-md border-2 border-line-strong bg-bg shadow-2"
    >
      <div className="flex items-center gap-1 border-b-2 border-line-strong bg-sunk px-2 py-1">
        <NavButton
          label="Back"
          icon="back"
          enabled={canBack}
          onPress={() => nav.goBack()}
        />
        <NavButton
          label="Forward"
          icon="forward"
          enabled={canForward}
          onPress={() => nav.goForward()}
        />
        <p className="m-0 min-w-0 flex-1 truncate rounded-pill border border-line bg-surface px-3 py-1.5 font-mono text-sm">
          <span className="sr-only">Address: </span>
          <bdi>{addressOf(at)}</bdi>
        </p>
        <button
          type="button"
          onClick={() => nav.go({ page: "home" })}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-sm border-2 border-transparent bg-transparent px-2 font-display text-sm font-bold text-fg hover:border-line-strong"
        >
          Hub
        </button>
      </div>
      <div
        ref={page}
        tabIndex={-1}
        role="region"
        aria-label={`Hub page: ${addressOf(at)}`}
        className="grid gap-4 p-4 outline-none focus-visible:outline-3 focus-visible:outline-focus"
      >
        <HubPage
          at={at}
          world={world}
          session={session}
          go={(to) => nav.go(to)}
        />
      </div>
    </section>
  );
}

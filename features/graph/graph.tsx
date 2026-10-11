"use client";

import {
  type HTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { Oid } from "@/engine";
import { skin } from "@/themes/active";
import type { SkinLabel } from "@/themes/contract";
import { Button } from "@/ui/button";
import { DROP_ATTR } from "@/features/stage/manipulate/use-drag";
import { commitNameParts, headAt, labelsAt } from "./describe";
import { branchTarget, commitTarget } from "./drag/targets";
import { nextFocus } from "./keyboard";
import type { Highlight } from "./reach";
import { layoutGraph, type Layout } from "./layout";
import type { CommitView, RepoView } from "./view-model";

const DEFAULT_BRANCHES = new Set(["main", "master"]);

function slotOf(name: string): SkinLabel["slot"] {
  if (DEFAULT_BRANCHES.has(name)) return 0;
  let sum = 0;
  for (const c of name) sum += c.codePointAt(0) ?? 0;
  return (1 + (sum % 3)) as SkinLabel["slot"];
}

function stacks(view: RepoView, commit: CommitView) {
  type Keyed = SkinLabel & { key: string };
  const above: Keyed[] = [];
  const below: Keyed[] = [];
  const headHere = headAt(view, commit.oid);
  const onBranch = view.head.kind === "branch" ? view.head.branch : null;
  for (const label of labelsAt(view, commit.oid)) {
    const current = label.kind === "branch" && label.name === onBranch;
    const skinLabel: Keyed = {
      key: label.ref,
      text: label.name,
      kind: label.kind,
      current,
      slot: slotOf(label.name),
    };
    if (label.kind === "branch") above.push(skinLabel);
    else below.push(skinLabel);
  }
  if (headHere)
    above.push({
      key: "HEAD",
      text: "HEAD",
      kind: "head",
      current: true,
      slot: 0,
    });
  return { above, below };
}

/** Direct manipulation on the graph: drop targets, the aimed one, a draggable HEAD. */
export type GraphDrop = {
  readonly aimed: string | null;
  /** While carrying, a tap on a commit or label drops there. */
  readonly onPress: ((target: string) => void) | null;
  /** Pointer handlers that let HEAD be dragged straight off the graph. */
  readonly head: HTMLAttributes<HTMLElement>;
};

const dropProps = (drop: GraphDrop | undefined, target: string) =>
  drop
    ? {
        [DROP_ATTR]: target,
        "data-aimed": drop.aimed === target ? "" : undefined,
        onClick: drop.onPress ? () => drop.onPress?.(target) : undefined,
      }
    : {};

const marks = (highlight: Highlight | null | undefined, oid: Oid) => {
  if (!highlight) return {};
  const inside = highlight.oids.has(oid);
  if (highlight.kind === "lost") return inside ? { "data-lost": "" } : {};
  return { "data-reach": inside ? "in" : "out" };
};

/** The layout with the active theme's metrics. */
export const graphLayout = (view: RepoView): Layout =>
  layoutGraph(view, skin.graph);

/** The commit graph: an ordered list of commits over one SVG of edges (ADR-003). */
export function CommitGraph({
  view,
  layout,
  label,
  describe,
  drop,
  highlight,
  onLabelHover,
  onCommitHover,
}: {
  view: RepoView;
  layout: Layout;
  label: string;
  drop?: GraphDrop;
  /** Commits to light up (reachable) or mark (about to be lost); CSS only. */
  highlight?: Highlight | null;
  /** Pointer over a branch label (its name) or off it (null). */
  onLabelHover?: (name: string | null) => void;
  /** Pointer or focus on a commit (its ID) or off it (null). */
  onCommitHover?: (oid: Oid | null) => void;
  /** "Describe this graph": an engine summary of the repository. */
  describe?: () => string;
}) {
  const g = skin.graph;
  const [focused, setFocused] = useState<Oid | null>(null);
  const [described, setDescribed] = useState<{
    view: RepoView;
    text: string;
  } | null>(null);
  const description = described?.view === view ? described.text : null;
  const buttons = useRef(new Map<Oid, HTMLButtonElement>());
  const frame = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const fallback = view.head.target ?? view.commits.at(-1)?.oid ?? null;
  const active = focused && layout.nodes.has(focused) ? focused : fallback;
  const headX = view.head.target
    ? layout.nodes.get(view.head.target)?.x
    : undefined;

  useEffect(() => {
    const el = frame.current;
    if (!el || headX === undefined) return;
    const visible =
      headX >= el.scrollLeft && headX <= el.scrollLeft + el.clientWidth;
    if (!visible) el.scrollLeft = headX - el.clientWidth / 2;
  }, [headX]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!active) return;
    const next = nextFocus(event.key, active, view, layout);
    if (!next) return;
    event.preventDefault();
    setFocused(next);
    buttons.current.get(next)?.focus();
  };

  return (
    <figure className="m-0 grid gap-2">
      <div
        ref={frame}
        className="overflow-x-auto overscroll-x-contain rounded-md bg-g-bg"
      >
        <div
          className="relative"
          style={{
            width: layout.width,
            height: layout.height + g.top + g.bottom,
          }}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="absolute left-0 overflow-visible"
            style={{ top: g.top }}
            width={layout.width}
            height={layout.height}
          >
            {layout.edges.map((edge) => {
              const ghost =
                view.commits.find((c) => c.oid === edge.child)?.ghost !== 0;
              return (
                <path
                  key={edge.key}
                  data-choreo={`edge:${edge.key}`}
                  d={skin.edgePath({ ...edge, ghost })}
                  fill="none"
                  stroke={ghost ? "var(--g-dim)" : "var(--g-edge)"}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={ghost ? "2 7" : undefined}
                />
              );
            })}
          </svg>
          <ol
            aria-label={`${label}: commits, oldest first`}
            aria-describedby={description ? descriptionId : undefined}
            className="m-0 list-none p-0"
          >
            {view.commits.map((commit) => {
              const node = layout.nodes.get(commit.oid);
              if (!node) return null;
              const { above, below } = stacks(view, commit);
              return (
                <li
                  key={commit.oid}
                  className="absolute top-0 left-0"
                  style={{
                    transform: `translate(${node.x}px, ${node.y + g.top}px)`,
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute bottom-6 left-0 flex -translate-x-1/2 flex-col-reverse items-center gap-1.5"
                  >
                    {above.map((l) => (
                      <span
                        key={l.key}
                        data-choreo={`label:${l.key}`}
                        {...(l.kind === "branch"
                          ? dropProps(drop, branchTarget(l.text))
                          : {})}
                        {...(l.kind === "head" && drop ? drop.head : {})}
                        {...(onLabelHover && l.kind !== "head"
                          ? {
                              onPointerEnter: () => onLabelHover(l.text),
                              onPointerLeave: () => onLabelHover(null),
                            }
                          : {})}
                        className={
                          !drop
                            ? undefined
                            : l.kind === "head"
                              ? "pointer-events-auto cursor-grab touch-none select-none data-dragging:z-10 data-dragging:cursor-grabbing"
                              : "rounded-sm data-aimed:outline-2 data-aimed:outline-offset-2 data-aimed:outline-focus"
                        }
                      >
                        <skin.Label label={l} />
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    data-choreo={`commit:${commit.oid}`}
                    ref={(el) => {
                      if (el) buttons.current.set(commit.oid, el);
                      else buttons.current.delete(commit.oid);
                    }}
                    tabIndex={commit.oid === active ? 0 : -1}
                    onFocus={() => {
                      setFocused(commit.oid);
                      onCommitHover?.(commit.oid);
                    }}
                    onBlur={() => onCommitHover?.(null)}
                    onPointerEnter={() => onCommitHover?.(commit.oid)}
                    onPointerLeave={() => onCommitHover?.(null)}
                    {...dropProps(drop, commitTarget(commit.oid))}
                    {...marks(highlight, commit.oid)}
                    onKeyDown={onKeyDown}
                    className="relative block -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus data-aimed:outline-2 data-aimed:outline-offset-4 data-aimed:outline-focus data-[reach=in]:ring-6 data-[reach=in]:ring-hl data-[reach=out]:opacity-40 data-lost:outline-2 data-lost:outline-offset-4 data-lost:outline-fg data-lost:outline-dashed"
                  >
                    <skin.Node
                      node={{
                        id: commit.oid,
                        short: commit.short,
                        merge: commit.parents.length > 1,
                        root: commit.parents.length === 0,
                        ghost: commit.ghost,
                      }}
                    />
                    <span className="sr-only">
                      {commitNameParts(commit, view).map((part, i) => (
                        <span key={i}>
                          {i > 0 ? ", " : null}
                          {part.isolate ? <bdi>{part.text}</bdi> : part.text}
                        </span>
                      ))}
                    </span>
                  </button>
                  <div
                    aria-hidden="true"
                    className="absolute top-8 left-0 flex -translate-x-1/2 flex-col items-center gap-1"
                  >
                    {below.map((l) => (
                      <span key={l.key} data-choreo={`label:${l.key}`}>
                        <skin.Label label={l} />
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
          {view.commits.length === 0 ? (
            <p className="absolute inset-0 m-0 grid place-items-center text-sm text-fg-muted">
              No commits yet.
            </p>
          ) : null}
        </div>
      </div>
      {describe ? (
        <figcaption className="grid justify-items-start gap-1">
          <Button
            variant="quiet"
            aria-expanded={description !== null}
            onClick={() =>
              setDescribed(
                description === null ? { view, text: describe() } : null,
              )
            }
          >
            Describe this graph
          </Button>
          {description !== null ? (
            <p id={descriptionId} className="m-0 text-sm">
              {description}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

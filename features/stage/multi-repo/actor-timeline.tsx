"use client";

import { useId } from "react";
import type { Session } from "@/engine";
import { Button } from "@/ui/button";
import { useSession } from "../use-session";
import { timelineItems } from "./actor-timeline.model";

const MARK = { done: "Done", next: "Next", waiting: "Later" } as const;

/** Teammates' scripted actions: what they will do and when, with pause and step (X-08). */
export function ActorTimeline({ session }: { session: Session }) {
  const { world, actorsPaused } = useSession(session);
  const titleId = useId();
  const items = timelineItems(world);
  if (!items.length) return null;
  const waiting = items.some((i) => i.state !== "done");
  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-2 rounded-sm border border-line bg-surface p-3 shadow-1"
    >
      <h3 id={titleId} className="m-0 font-display text-base font-bold">
        Teammates
        <span className="ml-2 text-xs font-normal text-fg-muted">
          {actorsPaused
            ? "paused: they act when you step"
            : "they act on their own"}
        </span>
      </h3>
      <ol className="m-0 grid list-none gap-1 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            data-state={item.state}
            className="flex flex-wrap items-baseline gap-x-2 text-sm data-[state=done]:text-fg-muted"
          >
            <span className="font-semibold">{MARK[item.state]}:</span>
            <span>
              <bdi>{item.name}</bdi>, <bdi>{item.what}</bdi>
            </span>
            {item.state === "done" ? null : (
              <span className="text-fg-muted">({item.when})</span>
            )}
          </li>
        ))}
      </ol>
      {waiting ? (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-pressed={actorsPaused}
            onClick={() => session.setActorsPaused(!actorsPaused)}
          >
            Pause teammates
          </Button>
          <Button onClick={() => session.stepActor()}>
            Step: next action now
          </Button>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";
import {
  choosePlayground,
  playgroundHref,
  PROMPTS,
  STARTER_WORLDS,
} from "@/content/playground";
import { Sandbox } from "@/features/checkpoint/sandbox";
import { sessions } from "@/features/stage/session-registry";
import { Button } from "@/ui/button";
import { AppLink } from "@/ui/link";

/** Free play in a starter world or on a lesson prompt; nothing here is saved. */
export function Playground() {
  use(browser("The sandbox runs in the browser."));
  const query = useSearchParams();
  const choice = choosePlayground(query.get("world"), query.get("prompt"));
  const sessionKey = `playground:${choice.key}`;
  const [generation, setGeneration] = useState(0);
  const reset = () => {
    sessions.delete(sessionKey);
    setGeneration((g) => g + 1);
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Starter worlds" className="flex flex-wrap gap-2">
          {STARTER_WORLDS.map((w) => (
            <Link
              key={w.id}
              href={playgroundHref({ world: w.id })}
              aria-current={choice.starter === w ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-btn border-2 border-line-strong px-4 text-sm font-semibold text-fg no-underline aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft"
            >
              {w.title}
            </Link>
          ))}
        </nav>
        <Button onClick={reset} className="ml-auto">
          Reset
        </Button>
      </div>
      {choice.prompt ? (
        <section aria-labelledby="prompt" className="max-w-prose">
          <h2 id="prompt" className="m-0 text-xl font-bold">
            Prompt: {choice.prompt.title}
          </h2>
          <p className="mt-2 mb-0 font-display text-lg">{choice.prompt.goal}</p>
        </section>
      ) : null}
      <Sandbox
        key={`${sessionKey}:${generation}`}
        sessionKey={sessionKey}
        world={choice.world}
        target={choice.prompt?.target}
        hints={choice.prompt?.hints}
        queued={null}
        focus={false}
      />
      <details className="rounded-sm border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer content-center font-display font-bold">
          Prompt library
        </summary>
        <ul className="m-0 mt-2 grid gap-2 pl-5">
          {PROMPTS.map((p) => (
            <li key={p.id}>
              <AppLink href={playgroundHref({ prompt: p.id })}>
                {p.title}
              </AppLink>
              : {p.goal}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

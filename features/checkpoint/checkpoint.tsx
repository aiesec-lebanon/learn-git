"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import type { TargetSpec, WorldSpec } from "@/engine";
import type { Hints, ScenarioScene } from "@/content/define";
import type { StageFrame } from "@/features/stage/frame";
import { StageView } from "@/features/stage/stage";
import { onIdle } from "@/lib/idle";
import type { Reached, SandboxProps } from "./sandbox";
import { TargetPanel } from "./target-panel";

type Props = {
  sessionKey: string;
  reached: Reached;
  world: WorldSpec;
  target?: TargetSpec;
  hints?: Hints;
  scenario?: ScenarioScene;
  /** The start state, built on the server: the page shows it before the engine loads. */
  start: StageFrame;
};

function Preview({
  start,
  target,
  queued,
  onRun,
}: Pick<Props, "start" | "target"> & {
  queued: string | null;
  onRun: (line: string) => void;
}) {
  const id = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const line = new FormData(event.currentTarget).get("line");
    if (typeof line === "string" && line.trim()) onRun(line);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <StageView frame={start} animate={false} />
      <div className="grid content-start gap-4">
        <form
          onSubmit={submit}
          className="flex items-center gap-2 rounded-md bg-term-bg px-3 py-2 font-mono text-sm text-term-fg"
        >
          <label htmlFor={id} className="shrink-0 text-term-accent">
            <span className="sr-only">Command </span>$
          </label>
          <input
            id={id}
            name="line"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={queued !== null}
            className="min-h-11 min-w-0 flex-1 bg-transparent outline-none"
          />
        </form>
        {queued !== null ? (
          <p role="status" className="m-0 text-sm text-fg-muted">
            Preparing the sandbox.
          </p>
        ) : null}
        {target ? <TargetPanel target={target} /> : null}
      </div>
    </div>
  );
}

type Loaded = { readonly Sandbox: ComponentType<SandboxProps> };

/**
 * A Your turn checkpoint (X-06). The engine loads on the first pointer, key or
 * focus inside it, or when the browser is idle; a command typed before then waits.
 */
export function Checkpoint({
  sessionKey,
  reached,
  world,
  target,
  hints,
  scenario,
  start,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [queued, setQueued] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (wanted || !el) return;
    const want = () => setWanted(true);
    const events = ["pointerdown", "keydown", "focusin"] as const;
    for (const e of events) el.addEventListener(e, want);
    const cancel = onIdle(want);
    return () => {
      cancel();
      for (const e of events) el.removeEventListener(e, want);
    };
  }, [wanted]);

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    import("./sandbox").then(
      (module) => {
        if (!live) return;
        setFocus(Boolean(root.current?.contains(document.activeElement)));
        setLoaded({ Sandbox: module.Sandbox });
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [wanted]);

  return (
    <div ref={root}>
      {loaded ? (
        <loaded.Sandbox
          sessionKey={sessionKey}
          reached={reached}
          hints={hints}
          world={world}
          target={target}
          scenario={scenario}
          queued={queued}
          focus={focus}
        />
      ) : (
        <Preview
          start={start}
          target={target}
          queued={queued}
          onRun={(line) => {
            setQueued(line);
            setWanted(true);
          }}
        />
      )}
      {failed ? (
        <p role="alert" className="m-0 mt-4">
          The sandbox could not load. Check your connection and reload the page.
        </p>
      ) : null}
    </div>
  );
}

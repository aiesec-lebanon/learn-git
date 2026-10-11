"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { World } from "@/engine";
import type { Step } from "@/content/define";
import { useMotion } from "@/features/motion/policy";
import { StageView } from "@/features/stage/stage";
import { Transcript } from "@/features/stage/transcript";
import { Button } from "@/ui/button";
import type { ReferenceFrame } from "./frames";
import { frameKey } from "./key";

type Option = { readonly id: string; readonly label: string };

type Sandbox = {
  readonly world: World;
  readonly frame: (world: World, command: Step) => ReferenceFrame;
};

function Choice({
  legend,
  options,
  value,
  onChange,
  code = false,
}: {
  legend: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  code?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-2 font-display font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-btn border-2 border-line-strong px-3 text-sm has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="radio"
              name={name}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            {code ? <code className="font-mono">{o.label}</code> : o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid content-start gap-2">
      <h2 className="m-0 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Before and after a command, with presets, forms, replay and the learner's own sandbox. */
export function EntryView({
  presets,
  variants,
  frames,
  hub = false,
}: {
  /** A Hub card: its forms are actions on the Hub, not commands. */
  hub?: boolean;
  presets: readonly Option[];
  variants: readonly {
    readonly id: string;
    readonly label: string;
    readonly command: Step;
  }[];
  frames: Readonly<Record<string, ReferenceFrame>>;
}) {
  const motion = useMotion();
  const [preset, setPreset] = useState(presets[0]?.id ?? "");
  const [variant, setVariant] = useState(variants[0]?.id ?? "");
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [at, setAt] = useState<number | undefined>(undefined);
  const command = variants.find((v) => v.id === variant)?.command ?? "";

  const frame = useMemo(
    () =>
      sandbox
        ? sandbox.frame(sandbox.world, command)
        : frames[frameKey(preset, variant)],
    [sandbox, command, frames, preset, variant],
  );
  // A new object replays the animation; the first view shows the end state.
  const after = useMemo(
    () => (frame && replay ? { ...frame.after } : frame?.after),
    [frame, replay],
  );

  const pick = (set: (id: string) => void) => (id: string) => {
    set(id);
    setAt(undefined);
    setReplay((n) => n + 1);
  };

  const loadSandbox = async () => {
    const [{ sessions }, { referenceFrame }] = await Promise.all([
      import("@/features/stage/session-registry"),
      import("./frames"),
    ]);
    const latest = sessions.latest();
    if (!latest) {
      setNote(
        "No sandbox is open yet. Run a command in a lesson or the playground, then come back.",
      );
      return;
    }
    setNote(null);
    setAt(undefined);
    setSandbox({
      world: latest.session.getSnapshot().world,
      frame: referenceFrame,
    });
  };

  if (!frame || !after) return null;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {sandbox ? (
          <div className="grid content-start justify-items-start gap-2">
            <p className="m-0 font-display font-bold">
              Starting state: your sandbox
            </p>
            <Button onClick={() => setSandbox(null)}>
              Back to the presets
            </Button>
          </div>
        ) : (
          <Choice
            legend="Starting state"
            options={presets}
            value={preset}
            onChange={pick(setPreset)}
          />
        )}
        <Choice
          legend={hub ? "Action" : "Form"}
          options={variants.map((v) => ({ id: v.id, label: v.label }))}
          value={variant}
          onChange={pick(setVariant)}
          code={!hub}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {motion === "full" ? (
          <>
            <Button
              onClick={() => {
                setAt(undefined);
                setReplay((n) => n + 1);
              }}
            >
              Replay
            </Button>
            <label className="flex items-center gap-2 text-sm">
              Replay position
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((at ?? 1) * 100)}
                onChange={(event) => {
                  if (at === undefined) setReplay((n) => n + 1);
                  setAt(Number(event.currentTarget.value) / 100);
                }}
              />
            </label>
          </>
        ) : null}
        <Button variant="quiet" onClick={loadSandbox}>
          Load my sandbox state
        </Button>
        {note ? (
          <p role="status" className="m-0 text-sm text-fg-muted">
            {note}
          </p>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Before">
          <StageView frame={frame.before} animate={false} />
        </Panel>
        <Panel title="After">
          <StageView frame={after} at={at} />
        </Panel>
      </div>
      <Panel title={hub ? "What happened" : "What Git prints"}>
        <Transcript lines={frame.transcript} />
      </Panel>
    </div>
  );
}

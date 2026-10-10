"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import type { Session, World } from "@/engine";
import { useSession } from "@/features/stage/use-session";
import {
  compose,
  missing,
  type ParamValue,
  type ParamValues,
} from "./composer";
import {
  chipState,
  pathChoices,
  rank,
  type ChipVerb,
  type Param,
} from "./palette";

const chip =
  "inline-flex min-h-11 items-center gap-2 rounded-sm border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const pick = `${chip} cursor-pointer border-line-strong bg-surface has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-focus`;

const title = (verb: ChipVerb) =>
  verb.program === "git" ? `git ${verb.name}` : verb.name;

function Choices({
  name,
  options,
  multiple,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  multiple: boolean;
  value: ParamValue | undefined;
  onChange: (value: ParamValue) => void;
}) {
  const picked = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option} className={pick}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            className="sr-only"
            checked={picked.includes(option)}
            onChange={(e) =>
              onChange(
                multiple
                  ? e.target.checked
                    ? [...picked, option]
                    : picked.filter((p) => p !== option)
                  : option,
              )
            }
          />
          <span className="font-mono">{option}</span>
        </label>
      ))}
    </div>
  );
}

function ParamField({
  param,
  world,
  value,
  onChange,
}: {
  param: Param;
  world: World;
  value: ParamValue | undefined;
  onChange: (value: ParamValue) => void;
}) {
  const id = useId();
  if (param.kind === "flag")
    return (
      <label className={pick}>
        <input
          type="checkbox"
          className="sr-only"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="font-mono">{param.flag}</span>
        <span className="text-fg-muted">{param.label}</span>
      </label>
    );
  const options =
    param.kind === "paths" ? pathChoices(world, param.pick) : param.choices;
  const legend = `${param.label}${param.required ? "" : " (optional)"}`;
  if (options)
    return (
      <fieldset className="m-0 grid gap-1 border-0 p-0">
        <legend className="mb-1 p-0 text-sm font-medium">{legend}</legend>
        {options.length ? (
          <Choices
            name={id}
            options={options}
            multiple={param.kind === "paths" && !param.single}
            value={value}
            onChange={onChange}
          />
        ) : (
          <p className="m-0 text-sm text-fg-muted">Nothing to pick here.</p>
        )}
      </fieldset>
    );
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {legend}
      </label>
      <input
        id={id}
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="min-h-11 rounded-sm border border-line-strong bg-surface px-3 font-mono text-sm focus-visible:outline-2 focus-visible:outline-focus"
      />
    </div>
  );
}

function ParamSheet({
  verb,
  world,
  onRun,
  onCancel,
}: {
  verb: ChipVerb;
  world: World;
  onRun: (line: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ParamValues>([]);
  const previewId = useId();
  const line = compose(verb, values);
  const needs = missing(verb, values);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!needs) onRun(line);
  };
  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-sm border border-line bg-bg-alt p-3"
    >
      <p className="m-0 font-mono text-sm font-bold">{title(verb)}</p>
      {verb.params.map((param, i) => (
        <ParamField
          key={i}
          param={param}
          world={world}
          value={values[i]}
          onChange={(value) =>
            setValues((old) => {
              const next = [...old];
              next[i] = value;
              return next;
            })
          }
        />
      ))}
      <p className="m-0 text-sm">
        <span id={previewId} className="text-fg-muted">
          Will run:{" "}
        </span>
        <output aria-labelledby={previewId} className="font-mono">
          {line}
        </output>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={needs !== null}
          className={`${chip} border-accent-fill bg-accent-fill font-medium text-on-accent hover:bg-accent-fill-hover disabled:opacity-50`}
        >
          Run
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${chip} border-line-strong bg-surface`}
        >
          Back
        </button>
        {needs ? (
          <span className="text-sm text-fg-muted">Still needed: {needs}.</span>
        ) : null}
      </div>
    </form>
  );
}

/** Tap-based commands: a state-aware palette, then a parameter sheet that shows the command before it runs. */
export function CommandChips({ session }: { session: Session }) {
  const { world } = useSession(session);
  const state = useMemo(() => chipState(world), [world]);
  const verbs = useMemo(() => rank(state), [state]);
  const [chosen, setChosen] = useState<ChipVerb | null>(null);
  if (chosen)
    return (
      <ParamSheet
        key={chosen.name}
        verb={chosen}
        world={world}
        onCancel={() => setChosen(null)}
        onRun={(line) => {
          setChosen(null);
          session.run(line);
        }}
      />
    );
  return (
    <ul
      aria-label="Commands"
      className="m-0 flex list-none flex-wrap gap-2 p-0"
    >
      {verbs.map((verb) => (
        <li key={verb.name}>
          <button
            type="button"
            onClick={() =>
              verb.params.length
                ? setChosen(verb)
                : session.run(compose(verb, []))
            }
            className={`${chip} bg-surface ${verb.ready(state) ? "border-accent" : "border-line"}`}
          >
            <span className="font-mono font-medium">{title(verb)}</span>
            <span className="text-xs text-fg-muted">{verb.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

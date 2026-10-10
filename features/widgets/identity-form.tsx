"use client";

import { useId, useState, type FormEvent } from "react";
import { useAnnounce } from "@/features/announcer/announcer";
import { useLessonSandbox } from "@/features/lesson/lesson-sandbox";
import { sandboxFor } from "@/features/stage/session-registry";
import { Button } from "@/ui/button";
import { identityCommands } from "./identity-form.model";

const field =
  "min-h-11 w-full rounded-sm border-2 border-line-strong bg-sunk px-3 text-fg";

/** Types the config commands for your name and email, then runs them in your Your turn sandbox. */
export function IdentityForm() {
  const sandbox = useLessonSandbox();
  const say = useAnnounce();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ran, setRan] = useState<readonly string[]>([]);
  const ids = { name: useId(), email: useId(), out: useId() };
  const commands = identityCommands(name, email);
  if (!sandbox) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!commands.length) return;
    const session = sandboxFor(sandbox.sessionKey, sandbox.world);
    for (const command of commands) session.run(command);
    setRan(commands);
    say(`Ran ${commands.length} config commands in your sandbox.`);
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1"
    >
      <div className="grid gap-1">
        <label htmlFor={ids.name} className="font-semibold">
          Your name
        </label>
        <input
          id={ids.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className={field}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={ids.email} className="font-semibold">
          Your email
        </label>
        <input
          id={ids.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          className={field}
        />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Will run in your Your turn sandbox:
      </p>
      <output
        id={ids.out}
        htmlFor={`${ids.name} ${ids.email}`}
        className="grid min-h-11 rounded-sm bg-term-bg p-3 font-mono text-sm text-term-fg"
      >
        {commands.length
          ? commands.map((c) => <span key={c}>{c}</span>)
          : "Type a name or an email."}
      </output>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={!commands.length}>
          Run
        </Button>
        {ran.length ? (
          <span className="text-sm">
            Ran {ran.length === 1 ? "1 command" : `${ran.length} commands`} in
            your sandbox.
          </span>
        ) : null}
      </div>
    </form>
  );
}

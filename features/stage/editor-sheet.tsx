"use client";

import { useEffect, useId, useRef, type FormEvent } from "react";
import type { Session } from "@/engine";
import { Button } from "@/ui/button";
import { useSession } from "./use-session";

/** The editor a waiting command asked for (commit message or `edit <file>`), as a modal sheet. */
export function EditorSheet({ session }: { session: Session }) {
  const { pending } = useSession(session);
  const request = pending?.kind === "editor" ? pending : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const helpId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (request && !el.open) el.showModal();
    if (!request && el.open) el.close();
  }, [request]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const text = new FormData(event.currentTarget).get("text");
    session.resume(
      submitter?.getAttribute("value") === "save" ? String(text ?? "") : null,
    );
  };

  const onClose = () => {
    if (session.getSnapshot().pending?.kind === "editor") session.resume(null);
  };

  const message = request?.purpose === "commit-message";
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-sm border border-line bg-surface p-6 text-fg shadow-3 backdrop:bg-fg/40"
    >
      {request ? (
        <form
          key={request.initial}
          method="dialog"
          onSubmit={onSubmit}
          className="grid gap-4"
        >
          <h2 id={titleId} className="m-0 text-xl font-bold">
            {message ? "Commit message" : `Edit ${request.file}`}
          </h2>
          <p id={helpId} className="m-0 text-sm text-fg-muted">
            {message
              ? "Write the message on the first line. Lines starting with # are left out; an empty message stops the commit."
              : "Save writes the file; Cancel leaves it as it was."}
          </p>
          <label className="grid gap-1 text-sm font-medium">
            {message ? "Message" : `Content of ${request.file}`}
            <textarea
              name="text"
              defaultValue={request.initial}
              rows={10}
              spellCheck={message}
              className="w-full rounded-sm border border-line bg-bg p-2 font-mono text-sm text-fg"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" value="cancel">
              Cancel
            </Button>
            <Button type="submit" value="save" variant="primary">
              Save and close
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

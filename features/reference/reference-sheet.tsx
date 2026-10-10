"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { InteractionRequest, Session } from "@/engine";
import { referenceById } from "@/content/reference/registry";
import { referenceHref } from "@/content/routes";
import { useSession } from "@/features/stage/use-session";
import { Button } from "@/ui/button";
import { AppLink } from "@/ui/link";

/** `git <cmd> -h` and `git help <cmd>` open the command's entry over the sandbox. */
export function ReferenceSheet({ session }: { session: Session }) {
  const { pending } = useSession(session);
  const [closed, setClosed] = useState<InteractionRequest | null>(null);
  const request =
    pending?.kind === "open-reference" && pending !== closed ? pending : null;
  const entry = request ? referenceById(request.entryId) : undefined;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (request && !el.open) el.showModal();
    if (!request && el.open) el.close();
  }, [request]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={() => setClosed(pending)}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-sm border border-line bg-surface p-6 text-fg shadow-3 backdrop:bg-fg/40"
    >
      {request ? (
        <form method="dialog" className="grid gap-4">
          <h2 id={titleId} className="m-0 font-mono text-xl font-bold">
            {entry?.title ?? `git ${request.entryId}`}
          </h2>
          {entry ? (
            <>
              <p className="m-0">{entry.summary}</p>
              <ul className="m-0 grid gap-1 pl-5 text-sm">
                {entry.gotchas.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <AppLink href={referenceHref(entry.id)}>
                Open the full entry
              </AppLink>
            </>
          ) : (
            <p className="m-0">
              This command has no reference entry yet.{" "}
              <AppLink href="/reference">See all entries</AppLink>
            </p>
          )}
          <div>
            <Button type="submit">Close</Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

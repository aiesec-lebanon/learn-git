"use client";

import { useRef, useState } from "react";
import type { Session } from "@/engine";
import type { Hints } from "@/content/define";
import { useSession } from "@/features/stage/use-session";
import { referenceHref } from "@/content/routes";
import { Button } from "@/ui/button";
import { AppLink } from "@/ui/link";
import { HINT_LABELS, HINT_STEPS, nudgeDue } from "./hints";

type Offer = "waiting" | "open" | "closed";

/** Hints one step at a time, only on request; one nudge offer after repeated refusals. */
export function HintLadder({
  session,
  hints,
}: {
  session: Session;
  hints: Hints;
}) {
  const { history } = useSession(session);
  const [shown, setShown] = useState(0);
  const [offer, setOffer] = useState<Offer>("waiting");
  const ask = useRef<HTMLButtonElement>(null);
  if (offer === "waiting" && shown === 0 && nudgeDue(history)) setOffer("open");

  const more = () => {
    setShown((n) => Math.min(n + 1, HINT_STEPS.length));
    setOffer("closed");
  };

  return (
    <section aria-label="Hints" className="grid justify-items-start gap-2">
      {offer === "open" ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-sm bg-accent-soft p-2"
        >
          <p className="m-0 font-display font-semibold text-guide-ink">
            Want a nudge?
          </p>
          <Button
            variant="quiet"
            onClick={() => {
              more();
              ask.current?.focus();
            }}
          >
            Show the nudge
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setOffer("closed");
              ask.current?.focus();
            }}
          >
            No thanks
          </Button>
        </div>
      ) : null}
      {shown > 0 ? (
        <dl className="m-0 grid gap-2 text-sm">
          {HINT_STEPS.slice(0, shown).map((step) => (
            <div key={step}>
              <dt className="font-semibold">{HINT_LABELS[step]}</dt>
              <dd className="m-0">
                {hints[step]}
                {step === "pointer" && hints.reference ? (
                  <>
                    {" "}
                    <AppLink href={referenceHref(hints.reference)}>
                      Reference: git {hints.reference}
                    </AppLink>
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {shown < HINT_STEPS.length ? (
        <Button ref={ask} variant="quiet" onClick={more}>
          {shown === 0 ? "Show a hint" : "Show another hint"}
        </Button>
      ) : null}
    </section>
  );
}

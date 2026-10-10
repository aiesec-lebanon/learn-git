"use client";

import { catchError, type ErrorInfo } from "next/error";
import type { Session } from "@/engine";
import { Button } from "@/ui/button";

function StageError({ session }: { session: Session }, { retry }: ErrorInfo) {
  const back = (step: number) => {
    session.rewindTo(step);
    retry();
  };
  const { step, floor } = session.getSnapshot();
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-2 rounded-sm border border-line p-4"
    >
      <p className="m-0">
        The sandbox could not show this state. Your commands are still in its
        history.
      </p>
      <div className="flex flex-wrap gap-2">
        {step > floor ? (
          <Button onClick={() => back(step - 1)}>Go back one command</Button>
        ) : null}
        <Button variant="primary" onClick={() => back(floor)}>
          Reset this sandbox
        </Button>
      </div>
    </div>
  );
}

/** Keeps a failure inside one sandbox; the rest of the page keeps working. */
export const StageBoundary = catchError(StageError);

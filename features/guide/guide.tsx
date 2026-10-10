"use client";

import { useMemo } from "react";
import type { Session } from "@/engine";
import { useMotion } from "@/features/motion/policy";
import { useSession } from "@/features/stage/use-session";
import { GuideCharacter } from "@/themes/active";
import { guideLine, type Verbosity } from "./controller";

/** The guide beside the stage; the announcer speaks, so its words here stay quiet. */
export function Guide({
  session,
  verbosity,
  achieved = false,
}: {
  session: Session;
  verbosity: Verbosity;
  achieved?: boolean;
}) {
  const { latest } = useSession(session);
  const motion = useMotion();
  const line = useMemo(
    () => guideLine(latest, verbosity, achieved),
    [latest, verbosity, achieved],
  );
  if (verbosity === "off") return null;
  return (
    <aside
      aria-label="Guide"
      className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3"
    >
      <div className="size-16">
        <GuideCharacter pose={line.pose} animate={motion === "full"} />
      </div>
      <p className="m-0 min-h-[2.7em] font-display text-lg/[1.35] font-semibold text-guide-ink">
        {line.text ?? ""}
      </p>
    </aside>
  );
}

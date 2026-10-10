"use client";

import { useState } from "react";
import { Switch } from "@/ui/switch";

const HIDDEN = [
  ["HEAD", "which branch you are on"],
  ["config", "settings for this repository"],
  ["objects/", "every snapshot, compressed"],
  ["refs/", "branch names and where they point"],
] as const;

/** The recipe-site folder after git init, with the hidden .git folder on request. */
export function GitReveal() {
  const [shown, setShown] = useState(false);
  return (
    <div className="grid gap-3 rounded-sm border border-line bg-surface p-4 shadow-1">
      <Switch checked={shown} onCheckedChange={setShown}>
        Show hidden files
      </Switch>
      <ul className="m-0 grid list-none gap-1 p-0 font-mono text-sm">
        <li>recipe-site/</li>
        {shown ? (
          <li className="pl-4">
            .git/{" "}
            <span className="font-body text-fg-muted">the repository</span>
            <ul className="m-0 grid list-none gap-1 p-0 pt-1 pl-4">
              {HIDDEN.map(([name, role]) => (
                <li key={name}>
                  {name} <span className="font-body text-fg-muted">{role}</span>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        <li className="pl-4">README.md</li>
        <li className="pl-4">index.html</li>
      </ul>
    </div>
  );
}

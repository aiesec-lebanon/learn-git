import { describe, expect, it } from "vitest";
import { identityCommands } from "./identity-form.model";
import { WIDGET_NAMES } from "./names";
import { snapshotAt, snapshotText } from "./snapshot-scrubber.model";

const MDX = import.meta.glob<string>("../../content/lessons/*/lesson.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("widgets", () => {
  it("exist for every name the lessons use", () => {
    for (const mdx of Object.values(MDX))
      for (const [, name] of mdx.matchAll(/<Widget\s+name="([^"]+)"/g))
        expect(WIDGET_NAMES).toContain(name);
  });

  it("compose quoted config commands, name first", () => {
    expect(identityCommands(" Ana María ", "ana@example.com")).toEqual([
      "git config set --global user.name 'Ana María'",
      "git config set --global user.email ana@example.com",
    ]);
    expect(identityCommands("O'Neil", "")).toEqual([
      "git config set --global user.name 'O'\\''Neil'",
    ]);
    expect(identityCommands(" ", " ")).toEqual([]);
  });

  it("mark what each snapshot added or changed", () => {
    expect(snapshotAt(0).files).toEqual([
      { path: "index.html", change: "added" },
    ]);
    expect(snapshotAt(3).files).toEqual([
      { path: "README.md", change: null },
      { path: "index.html", change: "changed" },
      { path: "soup.html", change: null },
    ]);
    expect(snapshotAt(9)).toEqual(snapshotAt(3));
    expect(snapshotText(1)).toBe("Snapshot 2 of 4: Add a README");
  });
});

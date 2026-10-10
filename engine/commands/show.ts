import type { OptionSpec } from "../cli/options";
import { diffFormat, FORMAT_OPTIONS, renderDiff } from "../diff/render";
import {
  commitChanges,
  commitEntry,
  HEADER_OPTIONS,
  headerStyle,
  unbornRefusal,
} from "../log/format";
import { notSimulated } from "../messages/git";
import { resolveHead } from "../refs/refs";
import { revisionInput } from "../revisions/args";
import { log } from "./log";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  ...FORMAT_OPTIONS,
  ...HEADER_OPTIONS,
  x("pretty", undefined, "optional"),
  x("format", undefined, "required"),
  x("abbrev-commit"),
  x("name-status"),
  x("numstat"),
  x("shortstat"),
  x("raw"),
  x("word-diff", undefined, "optional"),
  x("color", undefined, "optional"),
  x("unified", "U", "required"),
  x("date", undefined, "required"),
  x("show-signature"),
];

export const show = defineCommand({
  name: "show",
  counted: false,
  needsRepo: true,
  usage: log.usage,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const pool = world.objects;
    const unsupported = refuseUnsimulated("show", options);
    if (unsupported) return unsupported;
    const style = headerStyle("show", options);
    if (!("oneline" in style)) return style;
    const input = revisionInput(pool, repo, machine, options);
    if (!("specs" in input)) return input;
    const head = resolveHead(repo);
    const oids = input.revisions.length
      ? input.revisions.map((r) => r.oid)
      : head
        ? [head]
        : [];
    if (!oids.length) return unbornRefusal(repo);
    const format = diffFormat(options, "patch");
    const blocks: string[] = [];
    for (const oid of oids) {
      const commit = pool.get(oid);
      if (commit?.type !== "commit") {
        return refuse(
          "not-simulated",
          notSimulated("git show for trees and blobs"),
          1,
        );
      }
      if (commit.parents.length > 1) {
        return refuse(
          "not-simulated",
          notSimulated("git show for merge commits"),
          1,
        );
      }
      const pairs = commitChanges(pool, commit, input.specs);
      if (input.specs.length && !pairs.length) continue;
      const changes = renderDiff(pool, pairs, format);
      blocks.push(commitEntry(pool, repo, { oid, commit }, style, changes));
    }
    return { stdout: blocks.join(style.oneline ? "" : "\n") };
  },
});

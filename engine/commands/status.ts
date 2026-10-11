import { flag, lastValue, type OptionSpec } from "../cli/options";
import { notSimulated } from "../messages/git";
import { addMessages } from "../messages/add";
import { matchesPathspec, parsePathspecs } from "../pathspec";
import { computeStatus } from "../status/compute";
import { longStatus, shortStatus } from "../status/format";
import { headTracking } from "../status/tracking";
import { defineCommand, refuse } from "./registry";

const x = (long: string, short?: string, value?: "required" | "optional") => ({
  key: `x-${long}`,
  long,
  ...(short ? { short } : {}),
  ...(value ? { value } : {}),
});

const OPTIONS: readonly OptionSpec[] = [
  x("verbose", "v"),
  { key: "short", short: "s", long: "short" },
  { key: "branch", short: "b", long: "branch" },
  x("show-stash"),
  x("ahead-behind"),
  { key: "porcelain", long: "porcelain", value: "optional" },
  { key: "long", long: "long" },
  x("null", "z"),
  x("untracked-files", "u", "optional"),
  { key: "ignored", long: "ignored", value: "optional" },
  x("ignore-submodules", undefined, "optional"),
  x("column", undefined, "optional"),
  { key: "x-no-renames", long: "no-renames", negatable: false },
  { key: "x-renames", long: "renames", negatable: false },
  x("find-renames", "M", "optional"),
];

export const status = defineCommand({
  name: "status",
  counted: false,
  needsRepo: true,
  usage: "usage: git status [<options>] [--] [<pathspec>...]",
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const unsupported = [...options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      return refuse(
        "not-simulated",
        notSimulated(`git status --${unsupported.slice(2)}`),
        1,
      );
    }
    const porcelain = lastValue(options, "porcelain");
    if (typeof porcelain === "string" && porcelain !== "v1") {
      return refuse(
        "not-simulated",
        notSimulated(`git status --porcelain=${porcelain}`),
        1,
      );
    }
    const mode = lastValue(options, "ignored");
    if (mode === "matching") {
      return refuse(
        "not-simulated",
        notSimulated("git status --ignored=matching"),
        1,
      );
    }
    if (typeof mode === "string" && mode !== "no" && mode !== "traditional")
      return refuse(
        "usage",
        `fatal: Invalid ignored mode '${mode}'
`,
      );
    const ignored = mode === true || mode === "traditional";
    const parsed = parsePathspecs(options.args, repo.workdir, machine.cwd);
    if (!parsed.ok) {
      return refuse(
        "outside-repository",
        addMessages.outside(parsed.outside, repo.workdir),
      );
    }
    const data = computeStatus(world.objects, repo, machine.fs);
    const keep = (path: string) =>
      parsed.specs.length === 0 ||
      parsed.specs.some((s) => matchesPathspec(s, path));
    const branch = flag(options, "branch");
    if (porcelain !== undefined && porcelain !== false) {
      return {
        stdout: shortStatus(
          {
            data,
            repo,
            pool: world.objects,
            from: repo.workdir,
            keep,
            ignored,
            tracking: headTracking(world, machine, repo),
          },
          branch,
        ),
      };
    }
    const view = {
      data,
      repo,
      pool: world.objects,
      from: machine.cwd,
      keep,
      ignored,
      tracking: headTracking(world, machine, repo),
    };
    const short = flag(options, "short") && !flag(options, "long");
    return { stdout: short ? shortStatus(view, branch) : longStatus(view) };
  },
});

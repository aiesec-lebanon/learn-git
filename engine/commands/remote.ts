import { flag, type OptionSpec } from "../cli/options";
import {
  isValidRemoteName,
  remoteNames,
  remoteSection,
  remoteUrl,
} from "../config/remotes";
import { configValue } from "../config/scopes";
import { notSimulated } from "../messages/git";
import {
  REMOTE_ADD_USAGE,
  REMOTE_SUBCOMMANDS,
  REMOTE_USAGE,
  remoteMessages as m,
} from "../messages/remote";
import type { Effect } from "../types";
import { withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "verbose", short: "v", long: "verbose" },
  x("fetch", "f"),
  x("tags"),
  x("track", "t", "required"),
  x("master", "m", "required"),
  x("mirror", undefined, "optional"),
];

export const remote = defineCommand({
  name: "remote",
  counted: true,
  needsRepo: true,
  usage: REMOTE_USAGE,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const [sub, ...args] = options.args;
    if (sub === undefined) {
      const names = remoteNames(repo);
      if (!flag(options, "verbose")) {
        return { stdout: names.map((n) => `${n}\n`).join("") };
      }
      const lines = names.flatMap((name) => {
        const url = remoteUrl(world, machine, repo, name) ?? "";
        const push =
          configValue(world, machine, repo, `remote.${name}.pushurl`) ?? url;
        return [`${name}\t${url} (fetch)\n`, `${name}\t${push} (push)\n`];
      });
      return { stdout: lines.join("") };
    }
    if (sub !== "add") {
      return REMOTE_SUBCOMMANDS.includes(sub)
        ? refuse("not-simulated", notSimulated(`git remote ${sub}`), 1)
        : refuse("usage", m.unknownSubcommand(sub), 129);
    }
    const unsupported = refuseUnsimulated("remote add", options);
    if (unsupported) return unsupported;
    const [name, url] = args;
    if (name === undefined || url === undefined || args.length > 2) {
      return refuse("usage", `${REMOTE_ADD_USAGE}\n\n`, 129);
    }
    if (remoteUrl(world, machine, repo, name) !== null) {
      return refuse("usage", m.exists(name), 3);
    }
    if (!isValidRemoteName(name)) {
      return refuse("usage", m.invalidName(name));
    }
    const added = remoteSection(name, url);
    const effects: Effect[] = added.map((e) => ({
      kind: "config-changed",
      scope: "local",
      target: repo.id,
      key: e.key,
      from: null,
      to: e.value,
    }));
    return {
      world: withRepo(world, { ...repo, config: [...repo.config, ...added] }),
      effects,
    };
  },
});

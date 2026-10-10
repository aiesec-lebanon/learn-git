import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const PINNED_GIT = "2.45.1";

const KEPT = [
  "PATH",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "TEMP",
  "TMP",
];

/** Git for Windows and the Git Bash next to it (`FIXTURE_GIT`, `FIXTURE_BASH` override). */
export function resolveTools() {
  const git = process.env.FIXTURE_GIT ?? "git";
  const version = execFileSync(git, ["--version"], { encoding: "utf8" }).trim();
  const match = /^git version (\d+\.\d+\.\d+)/.exec(version);
  if (match?.[1] !== PINNED_GIT) {
    throw new Error(`Fixtures need Git ${PINNED_GIT}; found "${version}".`);
  }
  const execPath = execFileSync(git, ["--exec-path"], {
    encoding: "utf8",
  }).trim();
  const bash =
    process.env.FIXTURE_BASH ??
    (process.platform === "win32"
      ? path.resolve(execPath, "../../../bin/bash.exe")
      : "bash");
  if (process.platform === "win32" && !existsSync(bash)) {
    throw new Error(`Git Bash not found at ${bash}; set FIXTURE_BASH.`);
  }
  return { git, bash, version: version.replace(/^git version /, "") };
}

/** Pinned environment for one step (ADR-012, senior-engineer T1.01). */
export function stepEnv({ home, systemConfig, time, editor }) {
  const env = Object.fromEntries(
    KEPT.filter((k) => process.env[k] !== undefined).map((k) => [
      k,
      process.env[k],
    ]),
  );
  const date = `@${time} +0000`;
  Object.assign(env, {
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    USER: "you",
    USERNAME: "you",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
    GIT_PAGER: "cat",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "log.decorate",
    GIT_CONFIG_VALUE_0: "short",
  });
  if (systemConfig) env.GIT_CONFIG_SYSTEM = systemConfig;
  else env.GIT_CONFIG_NOSYSTEM = "1";
  if (editor) env.GIT_EDITOR = editor;
  return env;
}

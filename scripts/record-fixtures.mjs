// Records engine conformance fixtures from real Git (ADR-012).
// Usage: npm run fixtures:record [-- <id-prefix>]
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_GLOBAL_CONFIG } from "../engine/world/defaults.ts";
import { timeAt } from "../engine/world/clock.ts";
import { dumpBare, dumpState } from "./fixtures/dump.mjs";
import { resolveTools, stepEnv } from "./fixtures/env.mjs";
import {
  createRewriter,
  rewriteDeep,
  stableJson,
} from "./fixtures/rewrite.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = path.join(root, "engine/__fixtures__/scripts");
const recordedDir = path.join(root, "engine/__fixtures__/recorded");
const forward = (p) => p.replace(/\\/g, "/");

function listScripts(dir, rel = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      return listScripts(path.join(dir, entry.name), relPath);
    return entry.name.endsWith(".json") ? [relPath] : [];
  });
}

function writeConfig(git, file, entries) {
  for (const [key, value] of Object.entries(entries)) {
    execFileSync(git, ["config", "--file", file, "--add", key, value]);
  }
}

function prepareHome(git, home, spec) {
  mkdirSync(home, { recursive: true });
  for (const dir of spec.dirs ?? [])
    mkdirSync(path.join(home, dir), { recursive: true });
  for (const [file, content] of Object.entries(spec.files ?? {})) {
    mkdirSync(path.dirname(path.join(home, file)), { recursive: true });
    writeFileSync(path.join(home, file), content);
  }
  writeConfig(
    git,
    path.join(home, ".gitconfig"),
    spec.global ?? DEFAULT_GLOBAL_CONFIG,
  );
}

function prepare(git, tmp, world) {
  const home = path.join(tmp, "home", "you");
  prepareHome(git, home, world);
  const homes = { you: home };
  for (const [id, spec] of Object.entries(world.machines ?? {})) {
    homes[id] = path.join(tmp, "home", id);
    prepareHome(git, homes[id], spec);
  }
  const hub = path.join(tmp, "hub");
  for (const name of Object.keys(world.hub ?? {})) {
    const dir = path.join(hub, `${name}.git`);
    mkdirSync(dir, { recursive: true });
    execFileSync(git, ["init", "-q", "--bare", "-b", "main"], {
      cwd: dir,
      env: { ...stepEnv({ home, systemConfig: null, time: timeAt(0) }) },
    });
  }
  let systemConfig = null;
  if (world.system) {
    systemConfig = path.join(tmp, "etc", "gitconfig");
    mkdirSync(path.dirname(systemConfig), { recursive: true });
    writeConfig(git, systemConfig, world.system);
  }
  const editorScript = path.join(tmp, "editor.sh");
  writeFileSync(
    editorScript,
    'cp "$1" "$LG_EDITOR_LOG"\nif [ -f "$LG_EDITOR_TEXT" ]; then cp "$LG_EDITOR_TEXT" "$1"; fi\n',
  );
  return {
    home,
    homes,
    hub: world.hub ? hub : null,
    systemConfig,
    editorScript,
  };
}

/** Every machine reaches `https://hub.test/` through the bare repositories under `<tmp>/hub/`. */
function hubConfig(hub) {
  if (!hub) return {};
  return {
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_1: `url.file:///${forward(hub)}/.insteadOf`,
    GIT_CONFIG_VALUE_1: "https://hub.test/",
  };
}

function runStep(tools, ctx, step, seq) {
  const {
    cmd,
    editor,
    machine = "you",
  } = typeof step === "string" ? { cmd: step } : step;
  const cwdFile = path.join(ctx.tmp, "cwd.txt");
  const editorLog = path.join(ctx.tmp, "editor-log.txt");
  const editorText = path.join(ctx.tmp, "editor-text.txt");
  rmSync(editorLog, { force: true });
  rmSync(editorText, { force: true });
  if (editor !== undefined) writeFileSync(editorText, editor);
  const env = {
    ...stepEnv({
      home: forward(ctx.homes[machine]),
      systemConfig: ctx.systemConfig && forward(ctx.systemConfig),
      time: timeAt(seq),
      editor: `bash '${forward(ctx.editorScript)}'`,
    }),
    ...hubConfig(ctx.hub),
    LG_CWD: forward(ctx.cwds[machine]),
    LG_CWD_FILE: forward(cwdFile),
    LG_EDITOR_LOG: forward(editorLog),
    LG_EDITOR_TEXT: forward(editorText),
  };
  const script = `cd -- "$LG_CWD" || exit 99\n${cmd}\n__rc=$?\n(pwd -W 2>/dev/null || pwd) > "$LG_CWD_FILE"\nexit $__rc\n`;
  const result = spawnSync(tools.bash, ["-c", script], {
    env,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  ctx.cwds[machine] = readFileSync(cwdFile, "utf8").trim();
  const record = {
    cmd,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
    cwd: ctx.cwds[machine],
    ...(machine === "you" ? {} : { machine }),
  };
  try {
    record.editor = {
      received: readFileSync(editorLog, "utf8"),
      wrote: editor ?? null,
    };
  } catch {
    if (editor !== undefined) record.editor = { received: null, wrote: editor };
  }
  return record;
}

function record(tools, rel) {
  const script = JSON.parse(readFileSync(path.join(scriptsDir, rel), "utf8"));
  const world = script.world ?? {};
  const tmp = mkdtempSync(path.join(os.tmpdir(), "lg-fx-"));
  try {
    const prepared = prepare(tools.git, tmp, world);
    const specs = { you: world, ...world.machines };
    const ctx = {
      tmp,
      ...prepared,
      cwds: Object.fromEntries(
        Object.entries(prepared.homes).map(([id, home]) => [
          id,
          path.join(home, specs[id]?.cwd ?? ""),
        ]),
      ),
    };
    const steps = script.steps.map((step, seq) =>
      runStep(tools, ctx, step, seq),
    );
    const dump = (home) =>
      dumpState({
        git: tools.git,
        env: stepEnv({
          home,
          systemConfig: ctx.systemConfig,
          time: timeAt(steps.length),
        }),
        home,
        systemConfig: ctx.systemConfig,
      });
    const others = Object.keys(world.machines ?? {});
    const final = {
      ...dump(ctx.home),
      ...(others.length
        ? {
            machines: Object.fromEntries(
              others.map((id) => [id, dump(ctx.homes[id])]),
            ),
          }
        : {}),
      ...(ctx.hub ? { hub: dumpBare(tools.git, ctx.hub) } : {}),
    };
    const rewrite = createRewriter({
      tmpDir: tmp,
      hostname: os.hostname(),
      username: os.userInfo().username,
      aliases: [`/tmp/${path.basename(tmp)}`],
    });
    const fixture = rewriteDeep(
      { git: tools.version, script, steps, final },
      rewrite,
    );
    const out = path.join(recordedDir, rel);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, stableJson(fixture));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const tools = resolveTools();
const filter = process.argv[2] ?? "";
const selected = listScripts(scriptsDir).filter((rel) =>
  rel.startsWith(filter),
);
for (const rel of selected) {
  record(tools, rel);
  console.log(`recorded ${rel}`);
}
console.log(`${selected.length} fixture(s) with git ${tools.version}`);

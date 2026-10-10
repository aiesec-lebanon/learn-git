import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const toPosix = (p) => p.split(path.sep).join("/");

function walk(dir, visit, rel = "") {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    visit(relPath, full, statSync(full).isDirectory());
  }
}

/** Working files and directories under `root`, skipping `.git` and `~/.gitconfig`. */
function dumpTree(root) {
  const files = {};
  const dirs = [];
  const visit = (rel, full, isDir) => {
    if (rel.split("/").at(-1) === ".git" || rel === ".gitconfig") return;
    if (isDir) {
      dirs.push(rel);
      walk(full, visit, rel);
    } else {
      files[rel] = readFileSync(full, "utf8");
    }
  };
  walk(root, visit);
  return { files, dirs };
}

function findRepos(root) {
  const repos = [];
  const visit = (rel, full, isDir) => {
    if (!isDir) return;
    if (rel.split("/").at(-1) === ".git") {
      if (existsSync(path.join(full, "HEAD"))) repos.push(path.dirname(full));
      return;
    }
    walk(full, visit, rel);
  };
  if (existsSync(path.join(root, ".git", "HEAD"))) repos.push(root);
  walk(root, visit);
  return [...new Set(repos)];
}

function parseObjects(buffer) {
  const objects = {};
  let at = 0;
  while (at < buffer.length) {
    const lineEnd = buffer.indexOf(10, at);
    const [oid, type, size] = buffer.toString("utf8", at, lineEnd).split(" ");
    const body = buffer.subarray(lineEnd + 1, lineEnd + 1 + Number(size));
    at = lineEnd + 1 + Number(size) + 1;
    objects[oid] =
      type === "tree"
        ? { type, entries: parseTree(body) }
        : { type, body: body.toString("utf8") };
  }
  return objects;
}

function parseTree(body) {
  const entries = [];
  let at = 0;
  while (at < body.length) {
    const nul = body.indexOf(0, at);
    const [mode, ...name] = body.toString("utf8", at, nul).split(" ");
    entries.push({
      mode,
      name: name.join(" "),
      oid: body.toString("hex", nul + 1, nul + 21),
    });
    at = nul + 21;
  }
  return entries;
}

function configList(git, env, file) {
  if (!existsSync(file)) return [];
  const out = execFileSync(git, ["config", "--file", file, "--list", "-z"], {
    env,
    encoding: "utf8",
  });
  return out
    .split("\0")
    .filter(Boolean)
    .map((item) => {
      const nl = item.indexOf("\n");
      return nl < 0 ? [item, null] : [item.slice(0, nl), item.slice(nl + 1)];
    });
}

function dumpReflogs(gitDir) {
  const logs = path.join(gitDir, "logs");
  const reflogs = {};
  if (!existsSync(logs)) return reflogs;
  const visit = (rel, full, isDir) => {
    if (isDir) walk(full, visit, rel);
    else reflogs[rel] = readFileSync(full, "utf8").split("\n").filter(Boolean);
  };
  walk(logs, visit);
  return reflogs;
}

function dumpRepo(git, env, workdir) {
  const run = (args, encoding = "utf8") =>
    execFileSync(git, args, {
      cwd: workdir,
      env,
      encoding,
      maxBuffer: 1 << 28,
    });
  const gitDir = path.join(workdir, ".git");
  const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
  const refs = Object.fromEntries(
    run(["for-each-ref", "--format=%(refname) %(objectname)"])
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(" ")),
  );
  const index = run(["ls-files", "-s", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split("\t");
      const [mode, oid, stage] = meta.split(" ");
      return { mode, oid, stage: Number(stage), path: file };
    });
  return {
    head: head.startsWith("ref: ") ? { ref: head.slice(5) } : { oid: head },
    refs,
    objects: parseObjects(
      run(
        ["cat-file", "--batch-all-objects", "--batch", "--unordered"],
        "buffer",
      ),
    ),
    index,
    config: configList(git, env, path.join(gitDir, "config")),
    reflogs: dumpReflogs(gitDir),
  };
}

/** Final state of the machine: files, directories, config scopes and every repository. */
export function dumpState({ git, env, home, systemConfig }) {
  const tree = dumpTree(home);
  const repos = {};
  for (const workdir of findRepos(home)) {
    const rel = toPosix(path.relative(home, workdir));
    repos[rel] = dumpRepo(git, env, workdir);
  }
  return {
    files: tree.files,
    dirs: tree.dirs,
    config: {
      system: systemConfig ? configList(git, env, systemConfig) : [],
      global: configList(git, env, path.join(home, ".gitconfig")),
    },
    repos,
  };
}

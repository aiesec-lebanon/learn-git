import { GIT_COMMANDS, OTHER_COMMANDS } from "../messages/commands";

/** Suggestions Git 2.45.1 (Git for Windows) printed for common typos. */
const RECORDED: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries({
    a: ["add", "am"],
    ab: ["am"],
    ad: ["add", "am"],
    blam: ["blame"],
    branc: [],
    brach: ["branch"],
    brnch: ["branch"],
    chekout: ["checkout"],
    ci: ["gui"],
    clne: ["clone"],
    clon: ["clone", "column"],
    cmomit: ["commit"],
    cnfig: ["config"],
    co: ["commit", "clone", "log"],
    comit: ["commit"],
    commt: ["commit"],
    confg: ["config"],
    dff: ["diff"],
    dif: ["diff", "config", "difftool", "init"],
    fecth: ["fetch"],
    fetc: ["fetch", "bisect"],
    foo: ["flow", "hook"],
    ftech: ["fetch"],
    gerp: ["grep"],
    iint: ["init"],
    ini: ["init", "gui", "init-db"],
    int: ["init"],
    lgo: ["log"],
    lo: ["log", "flow"],
    merg: ["merge", "grep", "mktree"],
    mrege: ["merge"],
    og: ["log"],
    psh: ["push"],
    psuh: ["push"],
    pul: ["pull", "push"],
    pussh: ["push"],
    remot: ["remote"],
    rest: ["restore", "reset"],
    restor: ["restore", "remote"],
    rset: ["reset"],
    satus: ["status"],
    sho: ["show", "svn"],
    shw: ["show"],
    st: ["status", "reset", "stage", "stash", "svn"],
    stas: ["stash"],
    stat: ["status", "stage", "stash"],
    statu: ["status", "stage", "stash"],
    stauts: ["status"],
    stsh: ["stash"],
    sttus: ["status"],
    swich: ["switch"],
    swtch: ["switch"],
    tg: ["tag"],
    xyz: [],
  }),
);

/** Optimal string alignment distance (adjacent swaps count once). */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  const at = (i: number, j: number) => rows[i]?.[j] ?? 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      const row = rows[i];
      if (row) row[j] = best;
    }
  }
  return at(a.length, b.length);
}

const CANDIDATES = [...GIT_COMMANDS.keys(), ...OTHER_COMMANDS];

/** Commands to offer after "is not a git command": recorded for common typos, else the closest names. */
export function suggestCommands(typo: string): readonly string[] {
  const recorded = RECORDED.get(typo);
  if (recorded) return recorded;
  const scored = CANDIDATES.map((name) => ({
    name,
    score: distance(typo, name),
  }));
  const best = Math.min(...scored.map((s) => s.score));
  if (best > 2) return [];
  return scored.filter((s) => s.score === best).map((s) => s.name);
}

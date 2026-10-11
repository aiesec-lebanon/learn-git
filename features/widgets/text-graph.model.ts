import { runLine, type World } from "@/engine";

export const COMMAND = "git log --oneline --graph --all";

/** The command's lines, each with the commit it draws (if any); nothing is recorded. */
export function textGraph(world: World) {
  const outcome = runLine(world, COMMAND).outcomes.at(-1);
  const lines = (outcome?.output.stdout ?? "").replace(/\n$/, "").split("\n");
  const commits = new Map(
    (outcome?.meta.lines ?? []).map((ref) => [ref.line, ref.oid]),
  );
  return lines.map((text, i) => ({ text, oid: commits.get(i) ?? null }));
}

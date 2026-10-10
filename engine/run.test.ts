import { describe, expect, it } from "vitest";
import { createWorld } from "./index";
import { runLine } from "./run";

const outputs = (line: string) =>
  runLine(createWorld(), line).outcomes.map((o) => [
    o.output.stdout + o.output.stderr,
    o.output.exitCode,
  ]);

describe("runLine", () => {
  it("runs && only after success and ; always", () => {
    expect(outputs("nope && git --version; git --version")).toEqual([
      ["bash: nope: command not found\n", 127],
      ["git version 2.45.1.windows.1\n", 0],
    ]);
    expect(outputs("git --version && nope && git --version ; nope")).toEqual([
      ["git version 2.45.1.windows.1\n", 0],
      ["bash: nope: command not found\n", 127],
      ["bash: nope: command not found\n", 127],
    ]);
  });

  it("ticks the clock once per invocation, failed ones included", () => {
    const { world } = runLine(createWorld(), "git --version; nope; git x");
    expect(world.seq).toBe(3);
    expect(runLine(createWorld(), "echo 'x").world.seq).toBe(1);
  });

  it.each([
    ["echo 'x", "bash: unexpected EOF while looking for matching `''\n", 2],
    ["&& x", "bash: syntax error near unexpected token `&&'\n", 2],
    ["x &&", "bash: syntax error: unexpected end of file\n", 2],
    ["git log | less", "not simulated here: pipes in the shell\n", 1],
    [
      "x".repeat(2001),
      "not simulated here: commands longer than 2000 characters\n",
      1,
    ],
    [
      "x ".repeat(201),
      "not simulated here: commands with more than 200 words\n",
      1,
    ],
  ])("reports %j like bash", (line, message, code) => {
    expect(outputs(line)).toEqual([[message, code]]);
  });

  it("returns an outcome with meta and effects", () => {
    const [outcome] = runLine(createWorld(), "git help status").outcomes;
    expect(outcome?.request).toEqual({
      kind: "open-reference",
      entryId: "status",
    });
    expect(outcome?.meta).toEqual({ command: "git help", counted: false });
    const [typo] = runLine(createWorld(), "git comit").outcomes;
    expect(typo?.effects).toEqual([
      { kind: "refused", code: "unknown-command" },
    ]);
  });
});

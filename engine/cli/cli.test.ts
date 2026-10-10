import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  lastValue,
  parseOptions,
  stringValues,
  type OptionSpec,
} from "./options";
import { shellQuote, tokenize, type TokenizeResult } from "./tokenize";

const HOME = "/home/you";
const texts = (r: TokenizeResult) =>
  r.ok ? r.steps.map((s) => s.command.words.map((w) => w.text)) : r.error;

describe("tokenize", () => {
  it.each([
    ["git status", [["git", "status"]]],
    ["  git   add\t. ", [["git", "add", "."]]],
    [
      `git commit -m "Fix the  title"`,
      [["git", "commit", "-m", "Fix the  title"]],
    ],
    [`echo 'a "b" $c'`, [["echo", 'a "b" $c']]],
    [`echo "say \\"hi\\" \\$5 \\x"`, [["echo", 'say "hi" $5 \\x']]],
    [`echo a\\ b \\'`, [["echo", "a b", "'"]]],
    [`echo it'"'s`, [["echo", `it"s`]]],
    ["echo $ 5$", [["echo", "$", "5$"]]],
    [
      "cd ~ && cd ~/p",
      [
        ["cd", HOME],
        ["cd", `${HOME}/p`],
      ],
    ],
    ["echo a~ '~'", [["echo", "a~", "~"]]],
    ["git add . # stage all", [["git", "add", "."]]],
    ["# only a comment", []],
    ["", []],
    ["a; b\n\nc", [["a"], ["b"], ["c"]]],
    [
      "git add . &&\ngit commit",
      [
        ["git", "add", "."],
        ["git", "commit"],
      ],
    ],
    [
      `git commit -m "line one\nline two"`,
      [["git", "commit", "-m", "line one\nline two"]],
    ],
    [`echo "a\\\nb"`, [["echo", "ab"]]],
    ["echo ''", [["echo", ""]]],
    ["echo a#b", [["echo", "a#b"]]],
  ])("%j", (line, expected) => {
    expect(texts(tokenize(line, HOME))).toEqual(expected);
  });

  it("records operators and redirection", () => {
    const result = tokenize(
      "echo hi >> notes.txt && cat notes.txt; ls >out",
      HOME,
    );
    expect(result).toEqual({
      ok: true,
      steps: [
        {
          command: {
            words: [{ text: "echo" }, { text: "hi" }],
            redirect: { op: ">>", target: { text: "notes.txt" } },
          },
          next: "&&",
        },
        {
          command: { words: [{ text: "cat" }, { text: "notes.txt" }] },
          next: ";",
        },
        {
          command: {
            words: [{ text: "ls" }],
            redirect: { op: ">", target: { text: "out" } },
          },
          next: null,
        },
      ],
    });
  });

  it("marks unquoted glob characters only", () => {
    const result = tokenize(`git add *.txt '*.md' "a?"b[x]`, HOME);
    expect(result.ok && result.steps[0]?.command.words).toEqual([
      { text: "git" },
      { text: "add" },
      { text: "*.txt", pattern: "*.txt" },
      { text: "*.md" },
      { text: "a?b[x]", pattern: "a\\?b[x]" },
    ]);
  });

  it.each([
    ["echo 'oops", { kind: "unmatched-quote", quote: "'" }],
    ['echo "oops', { kind: "unmatched-quote", quote: '"' }],
    ["&& ls", { kind: "unexpected-token", token: "&&" }],
    ["; ls", { kind: "unexpected-token", token: ";" }],
    ["ls &&", { kind: "unexpected-eof" }],
    ["echo >", { kind: "unexpected-token", token: "newline" }],
    ["echo > && ls", { kind: "unexpected-token", token: "&&" }],
    ["echo > ; ls", { kind: "unexpected-token", token: ";" }],
    ["echo >>> x", { kind: "unexpected-token", token: ">" }],
    ["echo > > x", { kind: "unexpected-token", token: ">" }],
    ["echo $HOME", { kind: "unsupported", feature: "variables" }],
    ['echo "$(date)"', { kind: "unsupported", feature: "variables" }],
    ["echo `date`", { kind: "unsupported", feature: "command substitution" }],
    ['echo "`date`"', { kind: "unsupported", feature: "command substitution" }],
    ["git log | head", { kind: "unsupported", feature: "pipes" }],
    ["a || b", { kind: "unsupported", feature: "pipes" }],
    ["sleep 1 &", { kind: "unsupported", feature: "background jobs" }],
    ["ls &> x", { kind: "unsupported", feature: "stderr redirection" }],
    ["ls 2> x", { kind: "unsupported", feature: "stderr redirection" }],
    ["cat < x", { kind: "unsupported", feature: "input redirection" }],
    ["(cd x)", { kind: "unsupported", feature: "subshells" }],
    ["x".repeat(2001), { kind: "too-long" }],
    ["a ".repeat(201), { kind: "too-many-words" }],
  ])("%j fails", (line, error) => {
    expect(tokenize(line, HOME)).toEqual({ ok: false, error });
  });

  it("reads quoted arguments back unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ unit: "binary" }), { minLength: 1, maxLength: 8 }),
        (argv) => {
          const result = tokenize(argv.map(shellQuote).join(" "), HOME);
          expect(texts(result)).toEqual([argv]);
        },
      ),
    );
    expect(shellQuote("plain-path/a.txt")).toBe("plain-path/a.txt");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

const STATUS: OptionSpec[] = [
  { key: "verbose", short: "v", long: "verbose" },
  { key: "short", short: "s", long: "short" },
  { key: "branch", short: "b", long: "branch" },
  { key: "show-stash", long: "show-stash" },
  { key: "untracked", short: "u", long: "untracked-files", value: "optional" },
];
const COMMIT: OptionSpec[] = [
  { key: "all", short: "a", long: "all" },
  { key: "quiet", short: "q", long: "quiet" },
  { key: "message", short: "m", long: "message", value: "required" },
  { key: "renames", long: "renames", negatable: false },
];

describe("parseOptions", () => {
  it("bundles short flags with an attached or following value", () => {
    const parsed = parseOptions(
      ["-am", "msg", "-mSecond", "--message=Third", "--message", "4th"],
      COMMIT,
    );
    expect(parsed.ok && stringValues(parsed.options, "message")).toEqual([
      "msg",
      "Second",
      "Third",
      "4th",
    ]);
    expect(parsed.ok && lastValue(parsed.options, "all")).toBe(true);
  });

  it("mixes options and arguments and stops at --", () => {
    const parsed = parseOptions(
      ["a.txt", "-s", "--", "-x", "--short", "-"],
      STATUS,
    );
    expect(parsed).toEqual({
      ok: true,
      options: {
        values: new Map([["short", [true]]]),
        args: ["a.txt", "-x", "--short", "-"],
        afterDashDash: 1,
      },
    });
  });

  it("accepts unique prefixes, negation and optional values", () => {
    const parsed = parseOptions(
      ["--shor", "--no-short", "-u", "--untracked-files=no", "-uall"],
      STATUS,
    );
    expect(parsed.ok && parsed.options.values).toEqual(
      new Map<string, unknown>([
        ["short", [true, false]],
        ["untracked", [true, "no", "all"]],
      ]),
    );
  });

  it.each([
    [["--foo"], STATUS, { kind: "unknown-option", name: "foo" }],
    [["--no-foo"], STATUS, { kind: "unknown-option", name: "no-foo" }],
    [["-x"], STATUS, { kind: "unknown-switch", name: "x" }],
    [["-sx"], STATUS, { kind: "unknown-switch", name: "x" }],
    [
      ["--sho"],
      STATUS,
      {
        kind: "ambiguous",
        name: "sho",
        candidates: ["--short", "--show-stash"],
      },
    ],
    [["--short=yes"], STATUS, { kind: "takes-no-value", name: "short" }],
    [["--no-short=1"], STATUS, { kind: "takes-no-value", name: "no-short" }],
    [["-m"], COMMIT, { kind: "switch-requires-value", name: "m" }],
    [["-qm"], COMMIT, { kind: "switch-requires-value", name: "m" }],
    [["--message"], COMMIT, { kind: "option-requires-value", name: "message" }],
    [["--no-renames"], COMMIT, { kind: "unknown-option", name: "no-renames" }],
    [["-h"], COMMIT, { kind: "help" }],
  ])("%j fails", (argv, specs, error) => {
    expect(parseOptions(argv, specs)).toEqual({ ok: false, error });
  });
});

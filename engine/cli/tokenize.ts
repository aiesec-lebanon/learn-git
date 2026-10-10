import { LIMITS } from "../limits";

/** A shell word; `pattern` is set when it has unquoted `*`, `?` or `[`. */
export type Word = { readonly text: string; readonly pattern?: string };

export type SimpleCommand = {
  readonly words: readonly Word[];
  readonly redirect?: { readonly op: ">" | ">>"; readonly target: Word };
};

export type CommandStep = {
  readonly command: SimpleCommand;
  readonly next: "&&" | ";" | null;
};

export type Unsupported =
  | "variables"
  | "command substitution"
  | "pipes"
  | "background jobs"
  | "input redirection"
  | "stderr redirection"
  | "subshells";

export type TokenizeError =
  | { readonly kind: "unexpected-token"; readonly token: string }
  | { readonly kind: "unexpected-eof" }
  | { readonly kind: "unmatched-quote"; readonly quote: "'" | '"' }
  | { readonly kind: "unsupported"; readonly feature: Unsupported }
  | { readonly kind: "too-long" }
  | { readonly kind: "too-many-words" };

export type TokenizeResult =
  | { readonly ok: true; readonly steps: readonly CommandStep[] }
  | { readonly ok: false; readonly error: TokenizeError };

class Fail {
  constructor(readonly error: TokenizeError) {}
}

const GLOB = /[*?[]/;
const escapeGlob = (s: string) => s.replace(/[*?[\]\\]/g, "\\$&");
const VARIABLE_START = /[A-Za-z0-9_{(?!@#*$-]/;

/**
 * Splits a command line the way bash would for the sandbox's subset:
 * quotes and escapes, `~`, `>`, `>>`, `&&`, `;` and newlines. Variables,
 * substitution, pipes and the like are reported as unsupported.
 */
export function tokenize(line: string, home: string): TokenizeResult {
  if (line.length > LIMITS.lineChars) {
    return { ok: false, error: { kind: "too-long" } };
  }
  try {
    return { ok: true, steps: new Tokenizer(line, home).run() };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.error };
    throw e;
  }
}

class Tokenizer {
  private at = 0;
  private steps: CommandStep[] = [];
  private words: Word[] = [];
  private redirect: SimpleCommand["redirect"];
  private pendingOp: ">" | ">>" | null = null;
  private text = "";
  private pattern = "";
  private glob = false;
  private started = false;
  private wordCount = 0;
  private lastOp: "&&" | ";" | null = null;

  constructor(
    private readonly line: string,
    private readonly home: string,
  ) {}

  run(): CommandStep[] {
    const { line } = this;
    while (this.at < line.length) {
      const c = line[this.at] ?? "";
      if (c === " " || c === "\t") {
        this.endWord();
        this.at++;
      } else if (c === "\n" || c === ";") {
        this.operator(";", c === ";" ? ";" : "newline");
      } else if (c === "#" && !this.started) {
        const nl = line.indexOf("\n", this.at);
        this.at = nl < 0 ? line.length : nl;
      } else if (c === "'") {
        this.single();
      } else if (c === '"') {
        this.double();
      } else if (c === "\\") {
        this.literal(line[this.at + 1] ?? "\\");
        this.at += 2;
      } else if (c === "$") {
        if (VARIABLE_START.test(line[this.at + 1] ?? ""))
          this.unsupported("variables");
        this.literal("$");
        this.at++;
      } else if (c === "`") {
        this.unsupported("command substitution");
      } else if (
        c === "~" &&
        !this.started &&
        /^(?:[/\s;&>]|$)/.test(line[this.at + 1] ?? "")
      ) {
        this.literal(this.home);
        this.at++;
      } else if (GLOB.test(c)) {
        this.raw(c);
        this.at++;
      } else if (c === "|") {
        this.unsupported("pipes");
      } else if (c === "&") {
        if (line[this.at + 1] === "&") this.operator("&&", "&&");
        else
          this.unsupported(
            line[this.at + 1] === ">"
              ? "stderr redirection"
              : "background jobs",
          );
      } else if (c === "<") {
        this.unsupported("input redirection");
      } else if (c === "(" || c === ")") {
        this.unsupported("subshells");
      } else if (c === ">") {
        this.redirectOp();
      } else {
        this.raw(c);
        this.at++;
      }
    }
    this.endWord();
    if (this.pendingOp)
      this.fail({ kind: "unexpected-token", token: "newline" });
    if (this.words.length > 0) this.push(null);
    else if (this.lastOp === "&&") this.fail({ kind: "unexpected-eof" });
    return this.steps;
  }

  private fail(error: TokenizeError): never {
    throw new Fail(error);
  }

  private unsupported(feature: Unsupported): never {
    this.fail({ kind: "unsupported", feature });
  }

  private literal(s: string) {
    this.text += s;
    this.pattern += escapeGlob(s);
    this.started = true;
  }

  private raw(c: string) {
    this.text += c;
    this.pattern += c;
    if (GLOB.test(c)) this.glob = true;
    this.started = true;
  }

  private single() {
    const end = this.line.indexOf("'", this.at + 1);
    if (end < 0) this.fail({ kind: "unmatched-quote", quote: "'" });
    this.literal(this.line.slice(this.at + 1, end));
    this.at = end + 1;
  }

  private double() {
    this.started = true;
    for (this.at++; this.at < this.line.length; this.at++) {
      const c = this.line[this.at] ?? "";
      const next = this.line[this.at + 1] ?? "";
      if (c === '"') {
        this.at++;
        return;
      }
      if (c === "\\" && '$`"\\\n'.includes(next) && next !== "") {
        if (next !== "\n") this.literal(next);
        this.at++;
      } else if (c === "$" && VARIABLE_START.test(next)) {
        this.unsupported("variables");
      } else if (c === "`") {
        this.unsupported("command substitution");
      } else {
        this.literal(c);
      }
    }
    this.fail({ kind: "unmatched-quote", quote: '"' });
  }

  private redirectOp() {
    if (
      this.started &&
      /^\d+$/.test(this.text) &&
      !this.glob &&
      this.text === this.pattern
    ) {
      this.unsupported("stderr redirection");
    }
    this.endWord();
    if (this.pendingOp) this.fail({ kind: "unexpected-token", token: ">" });
    const append = this.line[this.at + 1] === ">";
    this.pendingOp = append ? ">>" : ">";
    this.at += append ? 2 : 1;
    if (this.line[this.at] === ">")
      this.fail({ kind: "unexpected-token", token: ">" });
  }

  private endWord() {
    if (!this.started) return;
    const word: Word = this.glob
      ? { text: this.text, pattern: this.pattern }
      : { text: this.text };
    if (++this.wordCount > LIMITS.words) this.fail({ kind: "too-many-words" });
    if (this.pendingOp) {
      this.redirect = { op: this.pendingOp, target: word };
      this.pendingOp = null;
    } else {
      this.words.push(word);
    }
    this.text = "";
    this.pattern = "";
    this.glob = false;
    this.started = false;
  }

  private operator(op: "&&" | ";", token: string) {
    this.endWord();
    if (this.pendingOp) this.fail({ kind: "unexpected-token", token });
    if (this.words.length === 0) {
      if (token !== "newline")
        this.fail({
          kind: "unexpected-token",
          token: op === "&&" ? "&&" : ";",
        });
    } else {
      this.push(op);
    }
    this.at += op.length;
  }

  private push(next: "&&" | ";" | null) {
    const command: SimpleCommand = this.redirect
      ? { words: this.words, redirect: this.redirect }
      : { words: this.words };
    this.steps.push({ command, next });
    this.lastOp = next;
    this.words = [];
    this.redirect = undefined;
  }
}

const SAFE = /^[A-Za-z0-9_\-.,:/@%+=]+$/;

/** Quotes one argument so `tokenize` reads it back unchanged. */
export function shellQuote(arg: string): string {
  return SAFE.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

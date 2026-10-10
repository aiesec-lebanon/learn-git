export type OptionSpec = {
  /** Name the command reads the value by. */
  readonly key: string;
  readonly short?: string;
  readonly long?: string;
  readonly value?: "none" | "required" | "optional";
  /** Whether `--no-<long>` is accepted (Git's default). */
  readonly negatable?: boolean;
};

/** `true` for a flag, `false` for `--no-<flag>`, a string for a value. */
export type OptionValue = string | boolean;

export type ParsedOptions = {
  /** Every occurrence in order, so repeatable options (`-m`) keep all values. */
  readonly values: ReadonlyMap<string, readonly OptionValue[]>;
  readonly args: readonly string[];
  /** Arguments after `--` (also included in `args`). */
  readonly afterDashDash: number | null;
};

export type OptionError =
  | { readonly kind: "unknown-option"; readonly name: string }
  | { readonly kind: "unknown-switch"; readonly name: string }
  | {
      readonly kind: "ambiguous";
      readonly name: string;
      readonly candidates: readonly [string, string];
    }
  | { readonly kind: "switch-requires-value"; readonly name: string }
  | { readonly kind: "option-requires-value"; readonly name: string }
  | { readonly kind: "takes-no-value"; readonly name: string }
  | { readonly kind: "help" };

export type ParseResult =
  | { readonly ok: true; readonly options: ParsedOptions }
  | { readonly ok: false; readonly error: OptionError };

class Fail {
  constructor(readonly error: OptionError) {}
}

type LongMatch = { spec: OptionSpec; negated: boolean; name: string };

function findLong(specs: readonly OptionSpec[], name: string): LongMatch {
  const forms: LongMatch[] = specs.flatMap((spec) => {
    if (!spec.long) return [];
    const out = [{ spec, negated: false, name: spec.long }];
    if (spec.negatable !== false) {
      out.push({ spec, negated: true, name: `no-${spec.long}` });
    }
    return out;
  });
  const exact = forms.find((f) => f.name === name);
  if (exact) return exact;
  const prefixed = forms.filter((f) => f.name.startsWith(name));
  const [first, second] = prefixed;
  if (first && second && prefixed.some((f) => f.spec !== first.spec)) {
    const other = prefixed.find((f) => f.spec !== first.spec) ?? second;
    throw new Fail({
      kind: "ambiguous",
      name,
      candidates: [`--${first.name}`, `--${other.name}`],
    });
  }
  if (first) return first;
  throw new Fail({ kind: "unknown-option", name });
}

/**
 * Git's option parsing: bundled short flags, attached values, `--opt=value`,
 * `--no-<opt>`, unique long prefixes, `--` and options mixed with arguments.
 */
export function parseOptions(
  argv: readonly string[],
  specs: readonly OptionSpec[],
): ParseResult {
  const values = new Map<string, OptionValue[]>();
  const args: string[] = [];
  let afterDashDash: number | null = null;
  const add = (key: string, value: OptionValue) => {
    values.set(key, [...(values.get(key) ?? []), value]);
  };
  try {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i] ?? "";
      if (afterDashDash !== null || arg === "-" || !arg.startsWith("-")) {
        args.push(arg);
      } else if (arg === "--") {
        afterDashDash = args.length;
      } else if (arg === "-h") {
        throw new Fail({ kind: "help" });
      } else if (arg.startsWith("--")) {
        const eq = arg.indexOf("=");
        const name = arg.slice(2, eq < 0 ? undefined : eq);
        const match = findLong(specs, name);
        const kind = match.spec.value ?? "none";
        const label = match.spec.long ?? name;
        if (match.negated || kind === "none") {
          if (eq >= 0)
            throw new Fail({ kind: "takes-no-value", name: match.name });
          add(match.spec.key, !match.negated);
        } else if (eq >= 0) {
          add(match.spec.key, arg.slice(eq + 1));
        } else if (kind === "optional") {
          add(match.spec.key, true);
        } else {
          const next = argv[++i];
          if (next === undefined)
            throw new Fail({ kind: "option-requires-value", name: label });
          add(match.spec.key, next);
        }
      } else {
        for (let j = 1; j < arg.length; j++) {
          const letter = arg[j] ?? "";
          const spec = specs.find((s) => s.short === letter);
          if (!spec) throw new Fail({ kind: "unknown-switch", name: letter });
          const kind = spec.value ?? "none";
          if (kind === "none") {
            add(spec.key, true);
            continue;
          }
          const rest = arg.slice(j + 1);
          if (rest) add(spec.key, rest);
          else if (kind === "optional") add(spec.key, true);
          else {
            const next = argv[++i];
            if (next === undefined)
              throw new Fail({ kind: "switch-requires-value", name: letter });
            add(spec.key, next);
          }
          break;
        }
      }
    }
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.error };
    throw e;
  }
  return { ok: true, options: { values, args, afterDashDash } };
}

/** The last value given for an option (Git's "last one wins"). */
export function lastValue(
  options: ParsedOptions,
  key: string,
): OptionValue | undefined {
  return options.values.get(key)?.at(-1);
}

export function flag(options: ParsedOptions, key: string): boolean {
  return lastValue(options, key) === true;
}

export function stringValues(options: ParsedOptions, key: string): string[] {
  return (options.values.get(key) ?? []).filter(
    (v): v is string => typeof v === "string",
  );
}

/** A broken engine invariant: a bug, never a Git refusal. */
export class EngineInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineInvariantError";
  }
}

export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new EngineInvariantError(message);
}

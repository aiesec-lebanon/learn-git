export const CLOCK_EPOCH = 1767225600;
export const CLOCK_TICK = 60;

/** Seconds since the Unix epoch at which invocation number `seq` runs. */
export function timeAt(seq: number): number {
  return CLOCK_EPOCH + CLOCK_TICK * seq;
}

/** Names one preset and form of an entry in its build-time frames. */
export const frameKey = (preset: string, variant: string) =>
  `${preset}/${variant}`;

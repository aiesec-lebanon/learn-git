import { LIMITS } from "../limits";
import type { Effect, World } from "../types";

/** Who acts on the Hub, in which world, at what time. */
export type HubContext = {
  readonly world: World;
  readonly actor: string;
  readonly time: number;
};

export type HubResult =
  | {
      readonly ok: true;
      readonly world: World;
      readonly effects: readonly Effect[];
    }
  | { readonly ok: false; readonly message: string };

export const refuseHub = (message: string): HubResult => ({
  ok: false,
  message,
});

/** Why a text field is not acceptable (empty when required, or too long), or null. */
export function textProblem(
  label: string,
  text: string,
  required: boolean,
): string | null {
  if (required && !text.trim()) return `${label} can't be empty.`;
  return text.length > LIMITS.hubTextChars
    ? `${label} is longer than ${LIMITS.hubTextChars} characters.`
    : null;
}

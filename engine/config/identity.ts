import type { Ident, Machine, Repo, World } from "../types";
import { configValue } from "./scopes";

const unknownIdentity = (machine: Machine) => `Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: unable to auto-detect email address (got '${machine.id}@laptop.(none)')
`;

/**
 * The committer identity from config. Without `user.email` Git refuses
 * (exit 128); without `user.name` it falls back to the account name.
 */
export function resolveIdentity(
  world: World,
  machine: Machine,
  repo: Repo | null,
): { ok: true; ident: Ident } | { ok: false; stderr: string } {
  const email = configValue(world, machine, repo, "user.email");
  if (!email) return { ok: false, stderr: unknownIdentity(machine) };
  const name = configValue(world, machine, repo, "user.name") || machine.id;
  return { ok: true, ident: { name, email } };
}

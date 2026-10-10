import { shellQuote } from "@/engine";

/** The config commands the identity form types: one per filled field, name first. */
export function identityCommands(name: string, email: string): string[] {
  const set = (key: string, value: string) =>
    `git config set --global ${key} ${shellQuote(value.trim())}`;
  return [
    ...(name.trim() ? [set("user.name", name)] : []),
    ...(email.trim() ? [set("user.email", email)] : []),
  ];
}

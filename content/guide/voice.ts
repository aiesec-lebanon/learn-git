const BANNED =
  /\b(just|simply|easy|easily|obviously|of course|great job|oops|well done|awesome)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

/** Breaches of the guide's voice (learning design 8): banned words, exclamation marks, emoji. */
export function voiceProblems(text: string): string[] {
  const problems: string[] = [];
  const banned = BANNED.exec(text);
  if (banned) problems.push(`says "${banned[0]}"`);
  if (text.includes("!")) problems.push("uses an exclamation mark");
  if (EMOJI.test(text)) problems.push("uses an emoji");
  return problems;
}

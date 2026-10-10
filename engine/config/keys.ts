/**
 * Git's canonical spelling of a config key: section and variable name in
 * lowercase, a subsection (the middle part) kept as written.
 * Returns null when Git would reject the key.
 */
export function canonicalKey(key: string): string | null {
  const first = key.indexOf(".");
  const last = key.lastIndexOf(".");
  if (first <= 0 || last === key.length - 1) return null;
  const section = key.slice(0, first);
  const name = key.slice(last + 1);
  if (!/^[A-Za-z0-9-]+$/.test(section) || !/^[A-Za-z][A-Za-z0-9-]*$/.test(name))
    return null;
  const middle = first === last ? "" : `${key.slice(first, last)}`;
  return `${section.toLowerCase()}${middle}.${name.toLowerCase()}`;
}

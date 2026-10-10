/** Copy-on-write map updates: the input map is never touched. */
export function withEntry<K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
  value: V,
): ReadonlyMap<K, V> {
  if (map.get(key) === value && map.has(key)) return map;
  return new Map(map).set(key, value);
}

export function withoutEntry<K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
): ReadonlyMap<K, V> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

import { hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Commit, GitObject, Signature, Tree } from "../types";

export function signatureLine(sig: Signature): string {
  return `${sig.name} <${sig.email}> ${sig.time} ${sig.tz}`;
}

export function commitText(commit: Commit): string {
  const lines = [
    `tree ${commit.tree}`,
    ...commit.parents.map((p) => `parent ${p}`),
    `author ${signatureLine(commit.author)}`,
    `committer ${signatureLine(commit.committer)}`,
  ];
  return `${lines.join("\n")}\n\n${commit.message}`;
}

function treeBytes(tree: Tree): Uint8Array {
  const parts = tree.entries.flatMap((e) => [
    utf8ToBytes(`${e.mode} ${e.name}\0`),
    hexToBytes(e.oid),
  ]);
  return concat(parts);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function body(object: GitObject): Uint8Array {
  switch (object.type) {
    case "blob":
      return utf8ToBytes(object.content);
    case "tree":
      return treeBytes(object);
    case "commit":
      return utf8ToBytes(commitText(object));
  }
}

/** The bytes Git hashes: `<type> <size>\0<body>`. */
export function encodeObject(object: GitObject): Uint8Array {
  const bytes = body(object);
  return concat([utf8ToBytes(`${object.type} ${bytes.length}\0`), bytes]);
}

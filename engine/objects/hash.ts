import { sha1 } from "@noble/hashes/legacy.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { GitObject, Oid } from "../types";
import { encodeObject } from "./serialize";

export const ZERO_OID = "0".repeat(40) as Oid;

const memo = new WeakMap<GitObject, Oid>();

export function hashObject(object: GitObject): Oid {
  let oid = memo.get(object);
  if (!oid) {
    oid = bytesToHex(sha1(encodeObject(object))) as Oid;
    memo.set(object, oid);
  }
  return oid;
}

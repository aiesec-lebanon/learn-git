import type { GitObject, Oid, Signature, TreeMode } from "../types";
import type { RecordedObject } from "./fixtures";

function parseSignature(text: string): Signature {
  const match = /^(.*) <(.*)> (\d+) ([+-]\d{4})$/.exec(text);
  if (!match) throw new Error(`Bad signature: ${text}`);
  const [, name = "", email = "", time = "0", tz = ""] = match;
  return { name, email, time: Number(time), tz };
}

/** A recorded object as engine data (commit headers parsed, message kept verbatim). */
export function importObject(recorded: RecordedObject): GitObject {
  if (recorded.type === "tree") {
    return {
      type: "tree",
      entries: recorded.entries.map((e) => ({
        mode: e.mode as TreeMode,
        name: e.name,
        oid: e.oid as Oid,
      })),
    };
  }
  if (recorded.type === "blob") return { type: "blob", content: recorded.body };
  if (recorded.type === "tag") throw new Error("Tags are not modeled yet");
  const split = recorded.body.indexOf("\n\n");
  const headers = recorded.body.slice(0, split).split("\n");
  const value = (name: string) =>
    headers
      .filter((h) => h.startsWith(`${name} `))
      .map((h) => h.slice(name.length + 1));
  return {
    type: "commit",
    tree: (value("tree")[0] ?? "") as Oid,
    parents: value("parent") as Oid[],
    author: parseSignature(value("author")[0] ?? ""),
    committer: parseSignature(value("committer")[0] ?? ""),
    message: recorded.body.slice(split + 2),
  };
}

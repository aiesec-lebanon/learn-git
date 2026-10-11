import { markerLines } from "./model";

/** The file exactly as Git wrote it, markers included, with marker lines numbered. */
export function RawView({ text }: { text: string }) {
  const marked = new Set(markerLines(text));
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return (
    <ol className="m-0 overflow-x-auto rounded-sm border border-line bg-sunk py-2 pr-2 pl-10 font-mono text-xs">
      {lines.map((line, i) => (
        <li
          key={i}
          className={
            marked.has(i + 1)
              ? "bg-st-conflict-bg whitespace-pre text-st-conflict"
              : "whitespace-pre"
          }
        >
          {line || " "}
        </li>
      ))}
    </ol>
  );
}

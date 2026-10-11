import type { ReactNode } from "react";
import type { DiffLineView, FileDiffView } from "@/engine";
import { cx } from "@/lib/cx";
import { Icon } from "@/themes/active";

const CHANGE = {
  added: "added",
  modified: "changed",
  deleted: "deleted",
  renamed: "renamed",
} as const;

const SIGN_CLASS = {
  "+": "bg-st-added-bg",
  "-": "bg-st-deleted-bg",
  " ": "",
} as const;

const SIGN_WORD = { "+": "added", "-": "removed", " ": "" } as const;

/** One file's changes as a table: old and new line numbers, the sign, the text. */
function FileDiff({
  file,
  lineExtra,
}: {
  file: FileDiffView;
  lineExtra?: (file: FileDiffView, line: DiffLineView) => ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-sm border border-line bg-surface">
      <h4 className="m-0 flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-sm font-semibold">
        <Icon name="file" />
        <bdi className="break-all font-mono">
          {file.from ? `${file.from} → ${file.path}` : file.path}
        </bdi>
        <span className="font-normal text-fg-muted">
          {CHANGE[file.change]} · +{file.added} −{file.deleted}
        </span>
      </h4>
      {file.binary || file.tooLarge ? (
        <p className="m-0 p-3 text-sm text-fg-muted">
          {file.binary
            ? "A binary file: no lines to show."
            : "Too large to show here."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <caption className="sr-only">Changes in {file.path}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Old line</th>
                <th scope="col">New line</th>
                <th scope="col">Change</th>
                <th scope="col">Text</th>
              </tr>
            </thead>
            {file.hunks.map((hunk) => (
              <tbody key={hunk.header}>
                <tr>
                  <td colSpan={4} className="bg-sunk px-3 py-1 text-fg-muted">
                    {hunk.header}
                  </td>
                </tr>
                {hunk.lines.map((line, i) => (
                  <tr key={i} className={SIGN_CLASS[line.sign]}>
                    <td className="w-10 px-2 text-right text-fg-muted select-none">
                      {line.old ?? ""}
                    </td>
                    <td className="w-10 px-2 text-right text-fg-muted select-none">
                      {line.new ?? ""}
                    </td>
                    <td className="w-5 text-center select-none">
                      <span aria-hidden="true">{line.sign}</span>
                      <span className="sr-only">{SIGN_WORD[line.sign]}</span>
                    </td>
                    <td className={cx("pr-3 whitespace-pre-wrap break-all")}>
                      <bdi>{line.text}</bdi>
                      {lineExtra?.(file, line)}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
}

/** Every changed file of a commit or a pull request. */
export function DiffView({
  files,
  lineExtra,
}: {
  files: readonly FileDiffView[];
  lineExtra?: (file: FileDiffView, line: DiffLineView) => ReactNode;
}) {
  if (!files.length)
    return <p className="m-0 text-sm text-fg-muted">No file changes.</p>;
  return (
    <div className="grid gap-3">
      {files.map((file) => (
        <FileDiff key={file.path} file={file} lineExtra={lineExtra} />
      ))}
    </div>
  );
}

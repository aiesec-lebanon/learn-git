import { lazy, Suspense } from "react";

const MarkdownRender = lazy(() =>
  import("./markdown-render").then((m) => ({ default: m.MarkdownRender })),
);

/** Hub Markdown (READMEs, descriptions, comments); plain text until the renderer loads. */
export function HubMarkdown({ text }: { text: string }) {
  return (
    <Suspense
      fallback={
        <div className="whitespace-pre-wrap">
          <bdi>{text}</bdi>
        </div>
      }
    >
      <MarkdownRender text={text} />
    </Suspense>
  );
}

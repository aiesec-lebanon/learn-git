/** Markdown from the Hub (READMEs, descriptions, comments), shown as plain text for now. */
export function HubMarkdown({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap">
      <bdi>{text}</bdi>
    </div>
  );
}

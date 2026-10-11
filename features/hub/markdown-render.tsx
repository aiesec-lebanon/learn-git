import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** What Hub Markdown may produce: text, emphasis, code, lists, links, quotes, headings, tables, strikethrough, disabled task boxes. */
const ALLOWED = [
  "p",
  "br",
  "hr",
  "em",
  "strong",
  "del",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "input",
  "a",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
];

const COMPONENTS: Components = {
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <span>{children}</span>
    ),
  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <input type="checkbox" checked={checked ?? false} disabled readOnly />
    ) : null,
};

/**
 * Markdown as learners and teammates write it on the Hub, rendered without
 * raw HTML (it shows as text), with images as their alt text and links
 * that open a new tab without access to this page (ADR-011, S-09).
 */
export function MarkdownRender({ text }: { text: string }) {
  return (
    <div className="grid gap-3 [&_:is(h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote,pre,table)]:m-0 [&_a]:text-accent-ink [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_code]:font-mono [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-bold [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xs [&_pre]:bg-sunk [&_pre]:p-2 [&_td]:border [&_td]:border-line [&_td]:px-2 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_ul]:pl-6">
      <Markdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        skipHtml={false}
        components={COMPONENTS}
      >
        {text}
      </Markdown>
    </div>
  );
}

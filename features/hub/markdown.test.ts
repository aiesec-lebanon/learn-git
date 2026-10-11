import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRender } from "./markdown-render";

const html = (text: string) =>
  renderToStaticMarkup(createElement(MarkdownRender, { text }));

describe("Hub Markdown", () => {
  it("renders the GitHub-flavoured basics", () => {
    const out = html(
      "# Title\n\n**bold** _it_ ~~gone~~ `code`\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> quote",
    );
    expect(out).toContain("<h1>Title</h1>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<del>gone</del>");
    expect(out).toContain(
      '<input type="checkbox" disabled="" readOnly="" checked=""/>',
    );
    expect(out).toContain("<table>");
    expect(out).toContain("<blockquote>");
  });

  it("keeps raw HTML, scripts and images inert", () => {
    const out = html(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">\n\n![a cat](https://example.com/cat.png)\n\n<b onclick="x()">hi</b>',
    );
    expect(out).not.toMatch(/<(script|img|b)[\s>]/);
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out).toContain("<span>a cat</span>");
  });

  it("opens safe links in a new tab and drops dangerous ones", () => {
    const out = html(
      "[ok](https://example.com) [js](javascript:alert(1)) [data](data:text/html,x)",
    );
    expect(out).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">ok<span class="sr-only"> (opens in a new tab)</span></a>',
    );
    expect(out).not.toMatch(/javascript:|data:text/);
    expect(out).toContain("<span>js</span>");
  });
});

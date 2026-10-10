/** The first focusable element: jumps past the header to the main content. */
export function SkipLink({ target = "main" }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only rounded-sm bg-surface px-4 py-2 font-semibold text-fg shadow-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}

import { ExternalLink } from "@/ui/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-alt">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-fg-muted sm:px-6">
        <p>Learn Git by AIESEC Lebanon</p>
        <p>
          Open source under the MIT License.{" "}
          <ExternalLink href="https://github.com/aiesec-lebanon/learn-git">
            Source on GitHub
          </ExternalLink>
        </p>
      </div>
    </footer>
  );
}

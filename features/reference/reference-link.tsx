import { referenceById } from "@/content/reference/registry";
import { referenceHref } from "@/content/routes";
import { AppLink } from "@/ui/link";

/** A hint's link to its reference entry; the registry loads only once it shows. */
export function ReferenceLink({ id }: { id: string }) {
  return (
    <AppLink href={referenceHref(id)}>
      Reference: {referenceById(id)?.title ?? `git ${id}`}
    </AppLink>
  );
}

import type { MDXComponents } from "mdx/types";
import { Beat, Cmd, ColdOpen, Term, Wrap } from "@/features/lesson/content";
import { Widget } from "@/features/widgets/registry";

const components = {
  ColdOpen,
  Beat,
  Wrap,
  Term,
  Cmd,
  Widget,
  code: Cmd,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}

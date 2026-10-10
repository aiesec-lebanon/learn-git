import type { MDXComponents } from "mdx/types";
import { Beat, Cmd, ColdOpen, Term, Wrap } from "@/features/lesson/content";

const components = {
  ColdOpen,
  Beat,
  Wrap,
  Term,
  Cmd,
  code: Cmd,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}

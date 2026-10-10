import type { Metadata } from "next";
import { Suspense } from "react";
import { Playground } from "@/features/playground/playground";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="m-0 text-3xl font-bold">Playground</h1>
      <p className="mt-3 mb-8 max-w-prose">
        Try anything: nothing here is saved, and Reset starts the world again.
      </p>
      <Suspense
        fallback={<p className="text-fg-muted">Preparing the sandbox.</p>}
      >
        <Playground />
      </Suspense>
    </div>
  );
}

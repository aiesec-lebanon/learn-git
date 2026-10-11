import type { Metadata } from "next";
import { Suspense } from "react";
import {
  SelfCheck,
  SelfCheckWithProgress,
} from "@/features/self-check/self-check";

export const metadata: Metadata = {
  title: "What can you already do?",
  description:
    "Tick what you could do today without looking anything up, and get a suggested place to start.",
};

export default function StartPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="m-0 text-3xl font-bold">What can you already do?</h1>
      <p className="mt-3 mb-8 max-w-prose">
        Tick what you could do today without looking anything up. Nothing here
        is scored or kept: the suggestion only helps you pick a place to start,
        and every chapter stays open.
      </p>
      <Suspense fallback={<SelfCheck finished={[]} />}>
        <SelfCheckWithProgress />
      </Suspense>
    </div>
  );
}

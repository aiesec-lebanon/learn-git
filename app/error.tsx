"use client";

import { Button } from "@/ui/button";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Something went wrong on this page</h1>
      <p className="mt-4 max-w-prose">
        Nothing you did caused this, and your progress is safe. Try again, or
        reload the page.
      </p>
      <Button variant="primary" className="mt-6" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

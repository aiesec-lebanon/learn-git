import { AppLink } from "@/ui/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">This page is not on the board</h1>
      <p className="mt-4 max-w-prose">
        The address may be mistyped, or the page may have moved.
      </p>
      <p className="mt-6">
        <AppLink href="/">Go to the home page</AppLink>
      </p>
    </div>
  );
}

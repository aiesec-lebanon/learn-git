import { copy } from "@/themes/active";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-display font-extrabold tracking-tight">Learn Git</h1>
      <p className="mt-4 font-display text-2xl text-fg-muted">{copy.tagline}</p>
      <p className="mt-8 max-w-prose">
        Learn Git and GitHub at the whiteboard: every command you run is drawn
        as it happens and explained in plain words, in a playground you
        can&apos;t break. The first lessons are being written now.
      </p>
    </div>
  );
}

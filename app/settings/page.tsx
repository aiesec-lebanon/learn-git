import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/features/preferences/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
      <h1 className="m-0 mb-8 text-3xl font-bold">Settings</h1>
      <Suspense
        fallback={<p className="m-0">Settings need JavaScript to change.</p>}
      >
        <SettingsForm />
      </Suspense>
    </div>
  );
}

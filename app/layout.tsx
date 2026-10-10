import type { Metadata } from "next";
import { bootstrapScript } from "@/features/preferences/bootstrap";
import { InlineScript } from "@/features/preferences/inline-script";
import { ThemeController } from "@/features/preferences/theme-controller";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { fontClassName } from "@/themes/active-fonts";
import { ThemeStyle } from "@/themes/theme-style";
import { SkipLink } from "@/ui/skip-link";
import "./globals.css";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: { default: "Learn Git", template: "%s · Learn Git" },
  description:
    "Learn Git and GitHub by doing: every command you run is drawn as it happens and explained in plain words. By AIESEC Lebanon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontClassName} suppressHydrationWarning>
      <head>
        <InlineScript html={bootstrapScript} />
        <ThemeStyle />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <ThemeController />
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

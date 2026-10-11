import { Figtree, JetBrains_Mono, Shantell_Sans } from "next/font/google";

const display = Shantell_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-display",
});

const body = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-body",
  preload: false,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-mono",
  preload: false,
});

export const fontClassName = `${display.variable} ${body.variable} ${mono.variable}`;

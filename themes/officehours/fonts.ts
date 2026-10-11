import { Figtree, JetBrains_Mono, Shantell_Sans } from "next/font/google";
import "./fallback-fonts.css";

const display = Shantell_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-display",
  fallback: ["Shantell Sans Fallback Twin"],
});

const body = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-body",
  fallback: ["Figtree Fallback Twin"],
  preload: false,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--family-mono",
  fallback: ["JetBrains Mono Fallback Twin"],
  preload: false,
});

export const fontClassName = `${display.variable} ${body.variable} ${mono.variable}`;

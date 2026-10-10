import { scale, tokens } from "./active";
import { themeToCss } from "./css";

const css = themeToCss(tokens, scale);

/** The active theme's custom properties, generated at build time. */
export function ThemeStyle() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

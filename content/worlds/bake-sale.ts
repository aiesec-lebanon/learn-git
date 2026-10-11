import { defineWorld, FIRST_COMMIT, writeFile } from "../define";

export const README = "# Bake sale\n\nSaturday at the community hall.\n";
export const INDEX =
  "<!doctype html>\n<title>Bake sale</title>\n<h1>Bake sale</h1>\n<p>Open 10:00 to 14:00.</p>\n";
export const MENU =
  "<h1>Menu</h1>\n<ul>\n  <li>Lemon cake: $4</li>\n  <li>Apple pie: $5</li>\n</ul>\n";
export const MENU_FIXED = MENU.replace("$4", "$3");

const files = {
  "bake-sale/README.md": README,
  "bake-sale/index.html": INDEX,
  "bake-sale/menu.html": MENU,
};

/** Two commits: the first snapshot, then cookies added to the menu. */
export const bakeSaleHistory = defineWorld({
  files,
  cwd: "bake-sale",
  setup: [
    ...FIRST_COMMIT,
    writeFile(
      "menu.html",
      MENU.replace("</ul>", "  <li>Cookies: $1</li>\n</ul>"),
    ),
    'git commit -am "Add cookies to the menu"',
  ],
});

/** One commit; then three files edited, one of them the lemon cake price fix. */
export const bakeSaleThreeChanges = defineWorld({
  files,
  cwd: "bake-sale",
  setup: [
    ...FIRST_COMMIT,
    'echo "Bring your own bag." >> README.md',
    writeFile("index.html", INDEX.replace("14:00", "15:00")),
    writeFile("menu.html", MENU_FIXED),
  ],
});

export const README_V2 = `${README}Cash only.\n`;
export const README_V3 = `${README_V2}Cards welcome too.\n`;

/** README.md in three versions: v1 committed, v2 staged, v3 in the working tree. */
export const readmeThreeVersions = defineWorld({
  files,
  cwd: "bake-sale",
  setup: [
    ...FIRST_COMMIT,
    writeFile("README.md", README_V2),
    "git add README.md",
    writeFile("README.md", README_V3),
  ],
});

export const STYLE = "body { font-family: serif; }\nh1 { color: teal; }\n";
export const INDEX_LATER = INDEX.replace("14:00", "15:00");

/** One commit with a stylesheet; then index.html improved, style.css broken and debug.log staged by accident. */
export const bakeSaleUndo = defineWorld({
  files: { ...files, "bake-sale/style.css": STYLE },
  cwd: "bake-sale",
  setup: [
    ...FIRST_COMMIT,
    writeFile("index.html", INDEX_LATER),
    writeFile("style.css", STYLE.replace("; }", ";")),
    'echo "debug: menu loaded" > debug.log',
    "git add debug.log",
  ],
});

export const ENV = "PAYMENT_KEY=test-1234\n";

/** One commit that tracks .env by mistake; then build output in dist/ and a log appear. */
export const bakeSaleSecrets = defineWorld({
  files: { ...files, "bake-sale/.env": ENV },
  cwd: "bake-sale",
  setup: [
    ...FIRST_COMMIT,
    "mkdir dist",
    'echo "<h1>Menu</h1>" > dist/menu.min.html',
    'echo "build finished" > app.log',
  ],
});

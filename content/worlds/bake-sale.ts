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

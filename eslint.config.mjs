import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const jsxA11y = nextVitals.find((c) => c.plugins?.["jsx-a11y"]).plugins[
  "jsx-a11y"
];

const htmlSinks = ["innerHTML", "outerHTML", "insertAdjacentHTML"].map(
  (property) => ({ property, message: "Render through React instead." }),
);
const documentWrite = {
  object: "document",
  property: "write",
  message: "Render through React instead.",
};

const engineProperties = [
  { object: "Date", property: "now", message: "Use the world clock." },
  {
    object: "Math",
    property: "random",
    message: "Engine must be deterministic.",
  },
  {
    object: "crypto",
    property: "randomUUID",
    message: "Engine must be deterministic.",
  },
  ...[
    "localeCompare",
    "toLocaleString",
    "toLocaleDateString",
    "toLocaleTimeString",
    "toLocaleUpperCase",
    "toLocaleLowerCase",
  ].map((property) => ({
    property,
    message: "Locale APIs differ between engines.",
  })),
];

const bannedImports = (regex, message) => ({
  "no-restricted-imports": ["error", { patterns: [{ regex, message }] }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      ...jsxA11y.configs.recommended.rules,
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-properties": ["error", ...htmlSinks, documentWrite],
      "react/no-danger": "error",
    },
  },
  {
    files: ["engine/**"],
    rules: {
      ...bannedImports(
        "^(react|react-dom|next)(/|$)|^@/|^node:",
        "The engine is a pure TypeScript core (ADR-010).",
      ),
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "localStorage",
          "sessionStorage",
          "navigator",
          "fetch",
          "XMLHttpRequest",
          "WebSocket",
          "Intl",
        ].map((name) => ({ name, message: "The engine has no host access." })),
      ],
      "no-restricted-properties": [
        "error",
        ...htmlSinks,
        documentWrite,
        ...engineProperties,
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Use the world clock.",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["content/**"],
    rules: bannedImports(
      "^@/(?!engine(/|$))",
      "Content imports only @/engine.",
    ),
  },
  {
    files: ["themes/**"],
    rules: bannedImports(
      "^@/(features|engine|content|app)(/|$)",
      "Themes stay independent of the product code.",
    ),
  },
  {
    files: ["ui/**"],
    rules: bannedImports("^@/(?!lib(/|$))", "UI primitives import only @/lib."),
  },
  {
    files: ["lib/**"],
    rules: bannedImports("^@/", "lib imports nothing from the app."),
  },
  {
    files: ["features/**"],
    rules: bannedImports("^@/app(/|$)", "Features never import routes."),
  },
  {
    files: ["scripts/**", "e2e/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["features/preferences/inline-script.tsx", "themes/theme-style.tsx"],
    rules: { "react/no-danger": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".10x/**",
  ]),
]);

export default eslintConfig;

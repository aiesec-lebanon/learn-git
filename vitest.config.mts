import { defineConfig } from "vitest/config";

const dirs = ["engine", "content", "features", "themes", "lib", "scripts"];

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: dirs.map((dir) => `${dir}/**/*.test.ts`),
          exclude: ["**/*.timing.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "timing",
          environment: "node",
          include: dirs.map((dir) => `${dir}/**/*.timing.test.ts`),
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["engine/**/*.ts"],
      exclude: [
        "engine/**/*.test.ts",
        "engine/__fixtures__/**",
        "engine/test/**",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        ...Object.fromEntries(
          ["objects", "cli", "diff", "matcher", "merge"].map((dir) => [
            `engine/${dir}/**`,
            { lines: 95, branches: 90 },
          ]),
        ),
      },
    },
  },
});

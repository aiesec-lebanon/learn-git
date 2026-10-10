import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
const port = 3000;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"], grepInvert: /@phone/ },
    { name: "firefox", use: devices["Desktop Firefox"], grepInvert: /@phone/ },
    { name: "webkit", use: devices["Desktop Safari"], grepInvert: /@phone/ },
    { name: "chromium-phone", use: devices["Pixel 7"], grep: /@phone/ },
    { name: "webkit-phone", use: devices["iPhone 15"], grep: /@phone/ },
  ],
  webServer: {
    command: CI ? "npm run start" : "npm run build && npm run start",
    port,
    reuseExistingServer: !CI,
    timeout: 300_000,
  },
});

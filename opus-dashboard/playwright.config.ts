import { defineConfig, devices } from "@playwright/test";

if (process.env.OPUS_E2E_ISOLATED !== "1") {
  throw new Error(
    "Run npm run test:e2e. The beauty journey requires its disposable backend and mailbox; it must not reuse a development or production deployment.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  ...(process.env.OPUS_E2E_SUITE === "hospitality"
    ? { testMatch: "**/hospitality-*.spec.ts" }
    : { testIgnore: "**/hospitality-*.spec.ts" }),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    locale: "en-GB",
    timezoneId: "Europe/Skopje",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

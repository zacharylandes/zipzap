import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      HOUSE_SEARCH_MOCK_SEARCH: "1",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from '@playwright/test'

const DEFAULT_DEV_PORT = 1414
const parsedDevPort = Number.parseInt(process.env.TRELLIS_PORT || '', 10)
const DEV_PORT = Number.isFinite(parsedDevPort) ? parsedDevPort : DEFAULT_DEV_PORT

const isCi = !!process.env.CI
const isAgent = process.env.PW_AGENT === '1'
const forceColdStart = process.env.PW_COLD === '1'
const skipWebServer = process.env.PW_NO_WEBSERVER === '1' || (isAgent && !forceColdStart)
const allBrowsers = isCi || process.env.PW_ALL_BROWSERS === '1'

const agentOutputDir = `test-results/${process.env.TRELLIS_AGENT_ID || `pid-${process.pid}`}`

/**
 * Local/agent runs default to chromium only (3× faster).
 * Set PW_ALL_BROWSERS=1 for the full matrix locally.
 * Set PW_COLD=1 to force webServer cold-start even when dev is up.
 * Agent runs use scripts/test-e2e.mjs (PW_AGENT=1, serialized lock).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: isAgent ? false : true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi || isAgent ? 1 : undefined,
  reporter: isAgent ? 'line' : 'html',
  outputDir: isAgent ? agentOutputDir : 'test-results',
  use: {
    baseURL: `http://localhost:${DEV_PORT}`,
    trace: isAgent ? 'off' : 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(allBrowsers
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],

  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: `http://localhost:${DEV_PORT}/api/graph/health`,
          reuseExistingServer: !isCi && !forceColdStart,
          timeout: 180_000,
        },
      }),
})

import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // Ensure Vitest runs from repo root, not `app/`,
  // otherwise it can discover test files in parent paths like `../node_modules/**`.
  root: '.',
  test: {
    globals: true,
    environment: 'nuxt',
    // Playwright specs live alongside unit tests but must be run via Playwright, not Vitest.
    include: ['tests/**/*.test.*', 'tests/**/*.spec.*'],
    exclude: ['tests/e2e/**', '**/playwright-report/**', '**/test-results/**', '**/node_modules/**'],
  },
})

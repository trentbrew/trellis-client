import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // Ensure Vitest runs from repo root, not `app/`,
  // otherwise it can discover test files in parent paths like `../node_modules/**`.
  root: '.',
  test: {
    globals: true,
    environment: 'nuxt',
    // Tests are colocated next to source (see app/CONVENTIONS.md "Testing").
    // Playwright e2e specs live in tests/e2e/ and are run via Playwright, not Vitest.
    include: ['app/**/*.test.*', 'server/**/*.test.*'],
    exclude: ['tests/e2e/**', '**/playwright-report/**', '**/test-results/**', '**/node_modules/**'],
  },
})

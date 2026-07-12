import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // Ensure Vitest runs from repo root, not `app/`,
  // otherwise it can discover test files in parent paths like `../node_modules/**`.
  root: '.',
  test: {
    globals: true,
    environment: 'nuxt',
    setupFiles: ['./vitest.setup.ts'],
    // Tests are colocated next to source (see app/CONVENTIONS.md "Testing").
    // Playwright e2e specs live in tests/e2e/ and are run via Playwright, not Vitest.
    include: ['app/**/*.test.*', 'server/**/*.test.*', 'scripts/**/*.test.*'],
    exclude: [
      'tests/e2e/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/node_modules/**',
      // Legacy alias stub — real coverage is in view-field-catalog.test.ts
      'app/composables/useCardPropertyVisibility.test.ts',
      'app/components/Counter.test.ts',
    ],
    server: {
      deps: {
        // npm trellis/core uses createRequire for better-sqlite3 — must not be Vite-bundled.
        external: ['trellis', 'trellis/core', 'better-sqlite3'],
      },
    },
  },
})

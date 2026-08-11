import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts', 'src/domain/**/index.ts'],
      reporter: ['text', 'lcov'],
      // SPEC.md P5：domain 層覆蓋率門檻 90%
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})

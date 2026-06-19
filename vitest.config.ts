import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * AETHER Vitest configuration.
 *
 * Unit tests live under tests/unit, integration tests under tests/integration,
 * contract tests under tests/contract, and end-to-end tests under tests/e2e
 * (see docs/engineering/development.md). Co-located component tests may use the
 * *.test.ts(x) / *.spec.ts(x) convention.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Specific aliases must precede '@' — rollup alias is first-match, so a
      // bare '@' would otherwise shadow '@/app' and '@/tests'.
      '@/app': path.resolve(__dirname, 'app'),
      '@/tests': path.resolve(__dirname, 'tests'),
      '@': path.resolve(__dirname, 'src'),
      // `server-only` is a build-time marker that throws when reached from a
      // client context. Under vitest (node) it resolves to the throwing variant,
      // so alias it to the package's no-op `empty.js` entry — the modules that
      // guard secrets with `server-only` (env, db, http) then load in tests
      // without weakening the production guard.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts'],
    },
  },
});

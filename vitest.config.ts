import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * AETHER Vitest configuration.
 *
 * Tests run as two projects so the fast unit gate (`npm run verify`) is never
 * blocked by a missing database:
 *
 * - `unit`        — tests/unit + co-located src tests. Always run by `npm test`
 *                   and the `verify` gate. No database required.
 * - `integration` — tests/integration (database/RLS). Run by
 *                   `npm run test:integration` and in CI against a live
 *                   `postgres` service. Skips itself when SUPABASE_DB_URL is
 *                   unset, so a stray local run degrades gracefully.
 *
 * NOTE: vitest child projects do not inherit the root `resolve.alias`, so the
 * alias map (and the `server-only` no-op shim) is applied to each project.
 *
 * Co-located component tests may use the *.test.ts(x) / *.spec.ts(x)
 * convention (see docs/engineering/development.md).
 */
const resolve = {
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
};

const sharedInclude = [
  'tests/**/*.test.ts',
  'tests/**/*.test.tsx',
  'tests/**/*.spec.ts',
  'tests/**/*.spec.tsx',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  'src/**/*.spec.ts',
  'src/**/*.spec.tsx',
];

export default defineConfig({
  resolve,
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts'],
    },
    projects: [
      {
        resolve,
        test: {
          name: 'unit',
          setupFiles: ['./tests/setup.ts'],
          include: sharedInclude,
          // Integration tests need a live database; keep them out of the unit
          // gate so `npm run verify` stays fast and self-contained.
          exclude: ['tests/integration/**', 'tests/e2e/**'],
        },
      },
      {
        resolve,
        test: {
          name: 'integration',
          // No shared setupFiles: integration tests manage their own database
          // connection and seed state (see tests/integration/db/helpers.ts).
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['node_modules/**', '.next/**'],
          // Integration files share ONE database, so they must run serially —
          // otherwise one file's committed seed leaks into another's "read all"
          // assertions (e.g. platform_operator reading every restaurant). Each
          // file's beforeAll/afterAll then fully brackets its own fixtures.
          fileParallelism: false,
        },
      },
    ],
  },
});

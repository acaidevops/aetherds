import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

/**
 * AETHER ESLint flat config.
 *
 * Strict TypeScript + Prettier baseline. Module-boundary enforcement lives in
 * dependency-cruiser (.dependency-cruiser.cjs) because it can reason about
 * path aliases and folder rules more precisely than ESLint import rules.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      '.codegraph/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'supabase/functions/**',
      'next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },

  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    // Config files and scripts run in Node, not the browser.
    files: ['*.config.{ts,mjs,js}', 'scripts/**/*.{ts,mjs,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    // `pg` is a server/tooling-only dependency (migration runner + integration
    // tests). Application code must reach the database through the Supabase
    // client seam (src/shared/db) so the driver never ships in the client
    // bundle. dependency-cruiser only codifies module folders, so this rule is
    // the actual guard against a stray `pg` import under app/ or src/.
    files: ['**/*.{ts,tsx,js,mjs}'],
    ignores: ['scripts/**', 'tests/integration/**', 'vitest.config.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              message:
                "Import the Supabase client from '@/shared/db' instead of 'pg' directly. The pg driver is server/tooling-only and must not ship in the client bundle.",
            },
            {
              name: 'node:pg',
              message:
                "Import the Supabase client from '@/shared/db' instead of 'pg' directly. The pg driver is server/tooling-only and must not ship in the client bundle.",
            },
          ],
        },
      ],
    },
  },

  prettierConfig,
);

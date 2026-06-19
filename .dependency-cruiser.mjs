import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// dependency-cruiser does not share capture groups between a rule's `from.path`
// and `to.path` (they are matched independently), so a backreference like
// `(?!\\1)` cannot compare the importing module to the imported module. We
// therefore emit one literal rule per module discovered under src/modules —
// each forbidding THAT module from reaching another module's internals.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.join(__dirname, 'src', 'modules');

const moduleNames = readdirSync(MODULES_DIR).filter((entry) =>
  statSync(path.join(MODULES_DIR, entry)).isDirectory(),
);

// ADR 0004: modules communicate through application-service interfaces and
// domain events, not direct cross-module table/repository mutations. A module
// may import another module only through that module's public surface (index).
const crossModuleRules = moduleNames.flatMap((mod) => [
  {
    name: `no-cross-module-infrastructure:${mod}`,
    severity: 'error',
    comment: `The ${mod} module must import another module only through its public surface (index.ts). See ADR 0004.`,
    from: { path: `^src/modules/${mod}/` },
    to: {
      path: `^src/modules/(?!${mod}/)([^/]+)/((?!index).+)\\.(t|j)sx?$`,
    },
  },
  {
    name: `no-cross-module-domain:${mod}`,
    severity: 'error',
    comment: `The ${mod} module must not import another module's domain. See ADR 0004.`,
    from: { path: `^src/modules/${mod}/` },
    to: { path: `^src/modules/(?!${mod}/)([^/]+)/domain/` },
  },
]);

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  // v17 renamed `recommended-warn` → `recommended-warn-only` and stopped
  // exposing bundled configs via the package `exports` map, so resolve the file
  // by relative path (warn-level baseline: no-circular, no-orphans, ...).
  extends: './node_modules/dependency-cruiser/configs/recommended-warn-only.cjs',
  forbidden: [
    ...crossModuleRules,
    // Routes call module application services, not infrastructure directly.
    {
      name: 'routes-via-application-services',
      severity: 'error',
      comment:
        'Route handlers must call module application services, not infrastructure or domain internals. See ADR 0004.',
      from: { path: '^app/' },
      to: {
        path: '^src/modules/([^/]+)/(domain|infrastructure)/',
      },
    },
    // Infrastructure must not be imported by shared/ (shared is lower-level).
    {
      name: 'shared-no-module-internals',
      severity: 'error',
      comment: 'src/shared must not depend on module internals. See ADR 0004.',
      from: { path: '^src/shared/' },
      to: {
        path: '^src/modules/',
      },
    },
  ],
  options: {
    doNotFollow: ['node_modules'],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};

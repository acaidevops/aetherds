import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SECRET_ENV_KEYS } from '../src/shared/config/env-schema';

/**
 * Lint `.env.example` for the two rules that keep secrets out of the client
 * bundle (acceptance criterion A1):
 *
 *   1. No secret key is ever exposed under a `NEXT_PUBLIC_` prefix.
 *   2. Only the allow-listed public variables carry the `NEXT_PUBLIC_` prefix,
 *      and each secret + public key is present as a placeholder.
 *
 * Run via `npm run check:env`. Exit non-zero on any violation so CI fails fast.
 * This complements the runtime guard in `tests/unit/shared/config/env.test.ts`.
 */

const ALLOWED_PUBLIC_KEYS = new Set<string>([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]);

function parseEnvExample(filePath: string): Record<string, string> {
  const text = readFileSync(filePath, 'utf8');
  const record: Record<string, string> = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals === -1) continue;
    const key = line.slice(0, equals).trim();
    const value = line
      .slice(equals + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/^'(.*)'$/, '$1');
    record[key] = value;
  }
  return record;
}

function main(): void {
  const file = path.resolve(process.cwd(), '.env.example');
  const record = parseEnvExample(file);
  const errors: string[] = [];

  for (const secret of SECRET_ENV_KEYS) {
    if (!(secret in record)) {
      errors.push(`Missing secret placeholder: ${secret}`);
    }
    const leaked = `NEXT_PUBLIC_${secret}`;
    if (leaked in record) {
      errors.push(`Secret leaked to client bundle: ${leaked} must not be public.`);
    }
  }

  for (const key of Object.keys(record)) {
    if (key.startsWith('NEXT_PUBLIC_') && !ALLOWED_PUBLIC_KEYS.has(key)) {
      errors.push(`Unexpected NEXT_PUBLIC_ variable: ${key} is not allow-listed.`);
    }
  }

  for (const key of ALLOWED_PUBLIC_KEYS) {
    if (!(key in record)) {
      errors.push(`Missing public placeholder: ${key}`);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`[check-env] ${err}`);
    }
    process.exit(1);
  }

  console.log('[check-env] .env.example OK: secrets server-only, public vars allow-listed.');
}

main();

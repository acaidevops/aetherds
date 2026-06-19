/**
 * Vitest global setup.
 *
 * Provides a valid baseline environment so modules that eagerly validate
 * `process.env` at import time (src/shared/config/env.ts → serverEnv) load
 * cleanly under test. Tests that exercise validation pass their own source
 * object to `loadServerEnv`, so this does not mask missing-env failures.
 */
function setDefault(key: string, value: string): void {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

setDefault('NODE_ENV', 'test');
setDefault('APP_ENV', 'development');
setDefault('APP_NAME', 'aetherds');
setDefault('APP_VERSION', '0.0.0');
setDefault('SUPABASE_URL', 'http://127.0.0.1:54321');
setDefault('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
setDefault('SUPABASE_DB_URL', 'postgresql://postgres:postgres@127.0.0.1:54321/postgres');
setDefault('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
setDefault('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon');
setDefault('OPENAI_API_KEY', 'test-openai');
setDefault('SPOTON_CLIENT_ID', 'test-client-id');
setDefault('SPOTON_CLIENT_SECRET', 'test-client-secret');
setDefault('SPOTON_SANDBOX_BASE_URL', 'https://sandbox.example.com');
setDefault('LOG_LEVEL', 'warn');

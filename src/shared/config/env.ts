import 'server-only';

import { serverEnvSchema, type ServerEnv } from './env-schema';

/**
 * Validate and freeze server environment variables at module load.
 *
 * This module imports `server-only`, so importing it from a client component
 * fails the build — guaranteeing secrets never reach the client bundle
 * (acceptance criterion A1). Fails fast with a readable error if required
 * variables are missing or invalid, rather than surfacing undefined behavior.
 */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse({
    nodeEnv: source.NODE_ENV,
    appEnv: source.APP_ENV,
    appName: source.APP_NAME,
    appVersion: source.APP_VERSION,

    supabaseUrl: source.SUPABASE_URL,
    supabaseServiceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY,
    supabaseDbUrl: source.SUPABASE_DB_URL,

    openaiApiKey: source.OPENAI_API_KEY,

    spotonClientId: source.SPOTON_CLIENT_ID,
    spotonClientSecret: source.SPOTON_CLIENT_SECRET,
    spotonSandboxBaseUrl: source.SPOTON_SANDBOX_BASE_URL,

    logLevel: source.LOG_LEVEL,
  });
}

/**
 * Validated server environment. Evaluated once at first import.
 *
 * In tests, prefer {@link loadServerEnv} with an injected `process.env`-like
 * object to avoid coupling to the host environment.
 */
export const serverEnv: ServerEnv = loadServerEnv();

import { z } from 'zod';

/**
 * AETHER environment variable schemas.
 *
 * Pure schema definitions — no `process.env` reads here so this module is safe
 * to import from either server or client code. The server-only `env.ts` module
 * reads and validates `process.env` against {@link serverEnvSchema}.
 *
 * Security invariant (acceptance criterion A1: "No environment secret exposed
 * to client bundle"): secrets are NEVER prefixed with `NEXT_PUBLIC_`. Only the
 * explicitly allow-listed public variables in {@link publicEnvSchema} reach the
 * browser. This is asserted by tests/unit/config/env.test.ts.
 */

const appEnv = z.enum(['development', 'staging', 'production']);

const logLevel = z.enum(['trace', 'debug', 'info', 'warn', 'error']);

/**
 * Server-only environment variables. Importing the parsed object requires the
 * `server-only` package, which fails the build if reached from a client bundle.
 */
export const serverEnvSchema = z.object({
  nodeEnv: z.string().default('development'),
  appEnv,
  appName: z.string().default('aetherds'),
  appVersion: z.string().default('0.0.0'),

  // Supabase — service identity (server only)
  supabaseUrl: z.string().url(),
  supabaseServiceRoleKey: z.string().min(1),
  supabaseDbUrl: z.string().min(1),

  // OpenAI — server only
  openaiApiKey: z.string().min(1),

  // SpotOn — server only
  spotonClientId: z.string().min(1),
  spotonClientSecret: z.string().min(1),
  spotonSandboxBaseUrl: z.string().url(),

  logLevel,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Variables intentionally exposed to the client bundle via `NEXT_PUBLIC_`.
 * Anything not listed here MUST NOT be prefixed with `NEXT_PUBLIC_`.
 */
export const publicEnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Names of env vars that, if ever seen with a `NEXT_PUBLIC_` prefix, would leak
 * a secret to the client bundle. Used by the secret-leak guard test.
 */
export const SECRET_ENV_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'OPENAI_API_KEY',
  'SPOTON_CLIENT_ID',
  'SPOTON_CLIENT_SECRET',
] as const;

export type SecretEnvKey = (typeof SECRET_ENV_KEYS)[number];

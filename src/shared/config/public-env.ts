import { publicEnvSchema, type PublicEnv } from './env-schema';

/**
 * Client-safe public environment loader.
 *
 * Reads `NEXT_PUBLIC_*` variables by direct reference so Next.js can inline
 * them into the client bundle as build-time constants. This module deliberately
 * does NOT import `server-only` and never touches `serverEnv`, so client
 * components can import it without breaking the build (acceptance criterion A1:
 * only the allow-listed public variables reach the browser).
 */
export function loadPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { serverEnv } from '../config/env';

/**
 * Supabase server client factory (ADR 0010/0011).
 *
 * Returns a client using the service-role identity for background workers and
 * server-side application services. Tenant scope is enforced via RLS plus
 * explicit server-side authorization — never client-provided IDs.
 *
 * The actual migration/RLS baseline lands in A3; this factory is the seam that
 * application services depend on so A3 can swap pooling/edge configuration
 * without touching module code.
 */
export type ServerSupabaseClient = SupabaseClient;

let cached: ServerSupabaseClient | null = null;

export function getServerSupabaseClient(): ServerSupabaseClient {
  if (cached) return cached;
  cached = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Test-only hook to inject a fake/alternate client. */
export function __setServerSupabaseClientForTests(client: ServerSupabaseClient | null): void {
  cached = client;
}

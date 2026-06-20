import 'server-only';

import type { Principal } from '../auth/principal';

/**
 * Map a server-derived {@link Principal} to the custom JWT claims the RLS tenant
 * helpers read (app.current_restaurant_id / location_id / role / device_id).
 *
 * This is the single source of truth shared between server-side authorization
 * (assertScope) and database RLS, so the two can never drift (ADR 0010 / 0012).
 * B1+ token-minting merges these into the JWT so every authenticated client
 * carries exactly the scope the server granted — never client-provided IDs.
 *
 * NOTE on `app_role` vs `role`: the returned object holds the AETHER application
 * role under `app_role`. The bare `role` claim is RESERVED by Supabase/
 * PostgREST (it carries the database role, e.g. 'authenticated', which
 * PostgREST uses to SET ROLE) and is owned by Supabase Auth — do not set it
 * here. RLS reads the app role via app.current_role() -> 'app_role'.
 *
 * Server-only: the resulting claims describe an authenticated identity and must
 * never be serialized into the client bundle by untrusted code.
 */
export function tenantClaimsFor(principal: Principal): Record<string, string> {
  const claims: Record<string, string> = { app_role: principal.role };

  if (principal.scope) {
    claims.restaurant_id = principal.scope.restaurantId;
    claims.location_id = principal.scope.locationId;
  }

  if (principal.context.kind === 'device') {
    claims.device_id = principal.context.deviceId;
  }

  return claims;
}

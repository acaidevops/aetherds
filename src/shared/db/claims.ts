import 'server-only';

import type { Principal } from '../auth/principal';

/**
 * Map a server-derived {@link Principal} to the JWT claim keys the RLS tenant
 * helpers read (app.current_restaurant_id / location_id / role / device_id).
 *
 * This is the single source of truth shared between server-side authorization
 * (assertScope) and database RLS, so the two can never drift (ADR 0010 / 0012).
 * B1+ token-minting uses this so every authenticated client carries exactly the
 * scope the server granted — never client-provided IDs.
 *
 * Server-only: the resulting claims describe an authenticated identity and must
 * never be serialized into the client bundle by untrusted code.
 */
export function tenantClaimsFor(principal: Principal): Record<string, string> {
  const claims: Record<string, string> = { role: principal.role };

  if (principal.scope) {
    claims.restaurant_id = principal.scope.restaurantId;
    claims.location_id = principal.scope.locationId;
  }

  if (principal.context.kind === 'device') {
    claims.device_id = principal.context.deviceId;
  }

  return claims;
}

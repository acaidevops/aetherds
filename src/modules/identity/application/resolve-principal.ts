import 'server-only';

import { AuthScopeDeniedError, type Principal, type TenantScope } from '@/shared/auth';

import { isActive } from '../domain/membership';
import type { MembershipRepository } from './ports';

/**
 * Resolve the staff {@link Principal} for an authenticated user at a requested
 * scope.
 *
 * Authentication (a valid Supabase session → `userId`) does not imply
 * authorization: the principal only exists if the user holds an ACTIVE
 * membership for exactly that restaurant+location (api-contracts.md §2). Scope
 * is taken from the membership, never echoed from client input (ADR 0010). A
 * missing or suspended membership is an `AUTH_SCOPE_DENIED` condition.
 */
export interface ResolveStaffPrincipalInput {
  readonly userId: string;
  readonly scope: TenantScope;
  readonly memberships: MembershipRepository;
}

export async function resolveStaffPrincipal(input: ResolveStaffPrincipalInput): Promise<Principal> {
  const membership = await input.memberships.findActiveMembership(input.userId, input.scope);
  if (!membership || !isActive(membership)) {
    throw new AuthScopeDeniedError(
      'No active membership authorizes this user for the requested location.',
    );
  }
  return {
    context: { kind: 'staff', userId: input.userId },
    role: membership.role,
    scope: { restaurantId: membership.restaurantId, locationId: membership.locationId },
  };
}

/**
 * Identity domain: staff account and location membership.
 *
 * A `StaffUser` is an individual account (one human, one login). A `Membership`
 * authorizes that user for a single location with one role (api-contracts.md §2:
 * "Individual Supabase Auth session + location membership/role"). Scope is
 * always derived from the membership, never from client input (ADR 0010).
 */

import type { TenantScope } from '@/shared/auth';

/** AETHER application roles a membership can grant. `platform_operator` is a
 * platform-wide JWT role, never a membership row, so it is excluded here. */
export type StaffRole = 'owner' | 'manager' | 'server' | 'food_safety_approver';

export type AccountStatus = 'active' | 'suspended';

export interface StaffUser {
  readonly id: string;
  readonly email: string;
  readonly displayName?: string;
  readonly status: AccountStatus;
}

export interface Membership {
  readonly id: string;
  readonly userId: string;
  readonly restaurantId: string;
  readonly locationId: string;
  readonly role: StaffRole;
  readonly status: AccountStatus;
}

/** The tenant scope a membership authorizes. */
export function membershipScope(membership: Membership): TenantScope {
  return { restaurantId: membership.restaurantId, locationId: membership.locationId };
}

export function isActive(membership: Pick<Membership, 'status'>): boolean {
  return membership.status === 'active';
}

import type { TenantScope } from '@/shared/auth';

import type { Membership } from '../domain/membership';

/**
 * Membership repository port. Implementations resolve memberships under the
 * caller's authenticated identity; database RLS (ADR 0010) is the backstop, so
 * even a buggy query cannot return another tenant's rows.
 */
export interface MembershipRepository {
  /**
   * The active membership authorizing `userId` for exactly `scope`, or null if
   * the user has no active membership there.
   */
  findActiveMembership(userId: string, scope: TenantScope): Promise<Membership | null>;

  /** All active memberships for a user, across locations (for surface routing). */
  listActiveMemberships(userId: string): Promise<readonly Membership[]>;
}

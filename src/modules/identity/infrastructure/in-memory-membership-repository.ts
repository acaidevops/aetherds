import type { TenantScope } from '@/shared/auth';

import { isActive, type Membership } from '../domain/membership';
import type { MembershipRepository } from '../application/ports';

/**
 * Deterministic in-memory MembershipRepository for unit tests and local dev.
 * Mirrors the active-only, scope-exact semantics of the real repository so
 * tests of resolve-principal/authorize run without a database.
 */
export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly memberships: Membership[];

  constructor(seed: readonly Membership[] = []) {
    this.memberships = [...seed];
  }

  async findActiveMembership(userId: string, scope: TenantScope): Promise<Membership | null> {
    return (
      this.memberships.find(
        (m) =>
          m.userId === userId &&
          m.restaurantId === scope.restaurantId &&
          m.locationId === scope.locationId &&
          isActive(m),
      ) ?? null
    );
  }

  async listActiveMemberships(userId: string): Promise<readonly Membership[]> {
    return this.memberships.filter((m) => m.userId === userId && isActive(m));
  }
}

import type { TenantScope } from '@/shared/auth';

import { isActive, type AccountStatus, type Membership } from '../domain/membership';
import type { MembershipRepository } from '../application/ports';

/**
 * Deterministic in-memory MembershipRepository for unit tests and local dev.
 * Mirrors the real repository's semantics: a membership resolves only when BOTH
 * the membership AND the owning user account are active (so a suspended account
 * can never resolve to a principal). Accounts not listed in `suspendedUserIds`
 * are treated as active.
 */
export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly memberships: Membership[];
  private readonly suspendedUserIds: ReadonlySet<string>;

  constructor(
    seed: readonly Membership[] = [],
    options: { readonly accountStatusByUserId?: Readonly<Record<string, AccountStatus>> } = {},
  ) {
    this.memberships = [...seed];
    this.suspendedUserIds = new Set(
      Object.entries(options.accountStatusByUserId ?? {})
        .filter(([, status]) => status === 'suspended')
        .map(([userId]) => userId),
    );
  }

  private resolvable(m: Membership): boolean {
    return isActive(m) && !this.suspendedUserIds.has(m.userId);
  }

  async findActiveMembership(userId: string, scope: TenantScope): Promise<Membership | null> {
    return (
      this.memberships.find(
        (m) =>
          m.userId === userId &&
          m.restaurantId === scope.restaurantId &&
          m.locationId === scope.locationId &&
          this.resolvable(m),
      ) ?? null
    );
  }

  async listActiveMemberships(userId: string): Promise<readonly Membership[]> {
    return this.memberships.filter((m) => m.userId === userId && this.resolvable(m));
  }
}

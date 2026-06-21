import { describe, expect, it } from 'vitest';

import { AuthScopeDeniedError } from '@/shared/auth';
import {
  InMemoryMembershipRepository,
  resolveStaffPrincipal,
  type Membership,
} from '@/modules/identity';

const SCOPE = { restaurantId: 'r1', locationId: 'l1' } as const;

function membership(over: Partial<Membership> = {}): Membership {
  return {
    id: 'm1',
    userId: 'u1',
    restaurantId: 'r1',
    locationId: 'l1',
    role: 'manager',
    status: 'active',
    ...over,
  };
}

describe('resolveStaffPrincipal', () => {
  it('builds a staff principal from an active membership, taking scope from the row', async () => {
    const memberships = new InMemoryMembershipRepository([membership()]);
    const principal = await resolveStaffPrincipal({ userId: 'u1', scope: SCOPE, memberships });

    expect(principal.context).toEqual({ kind: 'staff', userId: 'u1' });
    expect(principal.role).toBe('manager');
    expect(principal.scope).toEqual(SCOPE);
  });

  it('denies a user with no membership at the requested scope', async () => {
    const memberships = new InMemoryMembershipRepository([]);
    await expect(
      resolveStaffPrincipal({ userId: 'u1', scope: SCOPE, memberships }),
    ).rejects.toBeInstanceOf(AuthScopeDeniedError);
  });

  it('denies a suspended membership', async () => {
    const memberships = new InMemoryMembershipRepository([membership({ status: 'suspended' })]);
    await expect(
      resolveStaffPrincipal({ userId: 'u1', scope: SCOPE, memberships }),
    ).rejects.toBeInstanceOf(AuthScopeDeniedError);
  });

  it('denies an active membership when the user ACCOUNT is suspended', async () => {
    // The membership row is active, but the owning account is suspended — it
    // must not resolve (the repository requires both to be active).
    const memberships = new InMemoryMembershipRepository([membership()], {
      accountStatusByUserId: { u1: 'suspended' },
    });
    await expect(
      resolveStaffPrincipal({ userId: 'u1', scope: SCOPE, memberships }),
    ).rejects.toBeInstanceOf(AuthScopeDeniedError);
  });

  it('denies access to a location the user is not a member of', async () => {
    const memberships = new InMemoryMembershipRepository([membership()]);
    await expect(
      resolveStaffPrincipal({
        userId: 'u1',
        scope: { restaurantId: 'r1', locationId: 'OTHER' },
        memberships,
      }),
    ).rejects.toBeInstanceOf(AuthScopeDeniedError);
  });
});

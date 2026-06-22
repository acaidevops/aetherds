import { describe, expect, it } from 'vitest';

import { AuthScopeDeniedError, type Principal } from '@/shared/auth';
import {
  authorizeStaffCommand,
  ReauthenticationRequiredError,
  RoleNotPermittedError,
} from '@/modules/identity';

const SCOPE = { restaurantId: 'r1', locationId: 'l1' } as const;
const now = new Date('2026-06-21T12:00:00Z');

function principal(role: Principal['role'] = 'manager'): Principal {
  return { context: { kind: 'staff', userId: 'u1' }, role, scope: SCOPE };
}

describe('authorizeStaffCommand', () => {
  it('passes when scope and role match for a non-privileged command', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal('server'),
        scope: SCOPE,
        permittedRoles: ['server', 'manager'],
      }),
    ).not.toThrow();
  });

  it('rejects a scope mismatch', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal(),
        scope: { restaurantId: 'r1', locationId: 'OTHER' },
        permittedRoles: ['manager'],
      }),
    ).toThrow(AuthScopeDeniedError);
  });

  it('rejects a role not on the permitted list', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal('server'),
        scope: SCOPE,
        permittedRoles: ['manager', 'owner'],
      }),
    ).toThrow(RoleNotPermittedError);
  });

  it('requires recent reauthentication for a privileged command', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal(),
        scope: SCOPE,
        permittedRoles: ['manager'],
        command: 'manager.override',
        now,
      }),
    ).toThrow(ReauthenticationRequiredError);
  });

  it('allows a privileged command with a fresh reauthentication', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal(),
        scope: SCOPE,
        permittedRoles: ['manager'],
        command: 'manager.override',
        reauthenticatedAt: new Date(now.getTime() - 30_000),
        now,
      }),
    ).not.toThrow();
  });

  it('ignores reauthentication for an ordinary command', () => {
    expect(() =>
      authorizeStaffCommand({
        principal: principal(),
        scope: SCOPE,
        permittedRoles: ['manager'],
        command: 'cart.add_item',
        now,
      }),
    ).not.toThrow();
  });
});

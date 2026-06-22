import { describe, expect, it } from 'vitest';

import {
  assertRolePermitted,
  hasAtLeast,
  isPermitted,
  RoleNotPermittedError,
} from '@/modules/identity';

describe('role authorization', () => {
  it('ranks the operational hierarchy owner > manager > server', () => {
    expect(hasAtLeast('owner', 'manager')).toBe(true);
    expect(hasAtLeast('manager', 'manager')).toBe(true);
    expect(hasAtLeast('server', 'manager')).toBe(false);
    expect(hasAtLeast('owner', 'server')).toBe(true);
  });

  it('treats food_safety_approver as outside the operational ladder', () => {
    expect(hasAtLeast('food_safety_approver', 'server')).toBe(false);
  });

  it('permits only roles on the explicit list', () => {
    expect(isPermitted('manager', ['manager', 'owner'])).toBe(true);
    expect(isPermitted('server', ['manager', 'owner'])).toBe(false);
    // A non-staff principal role (e.g. platform_operator) simply fails to match.
    expect(isPermitted('platform_operator', ['manager', 'owner'])).toBe(false);
  });

  it('asserts a permitted role and throws otherwise', () => {
    expect(() => assertRolePermitted('owner', ['owner'])).not.toThrow();
    expect(() => assertRolePermitted('server', ['manager', 'owner'])).toThrow(
      RoleNotPermittedError,
    );
  });
});

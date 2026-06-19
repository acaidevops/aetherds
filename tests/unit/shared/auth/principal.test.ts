import { describe, expect, it } from 'vitest';

import { assertScope, AuthScopeDeniedError, type Principal } from '@/shared/auth';

const granted: Principal = {
  context: { kind: 'staff', userId: 'u1' },
  role: 'server',
  scope: { restaurantId: 'r1', locationId: 'l1' },
};

describe('assertScope', () => {
  it('returns the requested scope when it matches the granted scope', () => {
    expect(assertScope(granted, { restaurantId: 'r1', locationId: 'l1' })).toEqual({
      restaurantId: 'r1',
      locationId: 'l1',
    });
  });

  it('denies a different location', () => {
    expect(() => assertScope(granted, { restaurantId: 'r1', locationId: 'l2' })).toThrow(
      AuthScopeDeniedError,
    );
  });

  it('denies a different restaurant', () => {
    expect(() => assertScope(granted, { restaurantId: 'r2', locationId: 'l1' })).toThrow(
      AuthScopeDeniedError,
    );
  });

  it('denies when the principal has no tenant scope', () => {
    const scopeless: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
    };
    expect(() => assertScope(scopeless, { restaurantId: 'r1', locationId: 'l1' })).toThrow(
      AuthScopeDeniedError,
    );
  });
});

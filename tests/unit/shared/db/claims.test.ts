import { describe, expect, it } from 'vitest';

import type { Principal } from '@/shared/auth';
import { tenantClaimsFor } from '@/shared/db';

describe('tenantClaimsFor', () => {
  it('maps a scoped staff principal to restaurant/location/role claims', () => {
    const principal: Principal = {
      context: { kind: 'staff', userId: 'u1' },
      role: 'manager',
      scope: { restaurantId: 'r1', locationId: 'l1' },
    };
    expect(tenantClaimsFor(principal)).toEqual({
      role: 'manager',
      restaurant_id: 'r1',
      location_id: 'l1',
    });
  });

  it('includes device_id for a device principal', () => {
    const principal: Principal = {
      context: { kind: 'device', deviceId: 'd1' },
      role: 'server',
      scope: { restaurantId: 'r1', locationId: 'l1' },
    };
    expect(tenantClaimsFor(principal)).toMatchObject({
      role: 'server',
      device_id: 'd1',
    });
  });

  it('omits tenant claims for a scopeless platform principal', () => {
    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
    };
    const claims = tenantClaimsFor(principal);
    expect(claims).toEqual({ role: 'platform_operator' });
    expect(claims).not.toHaveProperty('restaurant_id');
    expect(claims).not.toHaveProperty('location_id');
  });
});

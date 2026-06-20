import { describe, expect, it } from 'vitest';

import type { Principal } from '@/shared/auth';
import { tenantClaimsFor } from '@/shared/db';

describe('tenantClaimsFor', () => {
  it('maps a scoped staff principal to restaurant/location/app_role claims', () => {
    const principal: Principal = {
      context: { kind: 'staff', userId: 'u1' },
      role: 'manager',
      scope: { restaurantId: 'r1', locationId: 'l1' },
    };
    expect(tenantClaimsFor(principal)).toEqual({
      app_role: 'manager',
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
      app_role: 'server',
      device_id: 'd1',
    });
  });

  it('never emits the Supabase-reserved `role` claim', () => {
    const principal: Principal = {
      context: { kind: 'staff', userId: 'u1' },
      role: 'manager',
      scope: { restaurantId: 'r1', locationId: 'l1' },
    };
    const claims = tenantClaimsFor(principal);
    expect(claims).not.toHaveProperty('role'); // owned by Supabase Auth
    expect(claims).toHaveProperty('app_role', 'manager');
  });

  it('omits tenant claims for a scopeless platform principal', () => {
    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
    };
    const claims = tenantClaimsFor(principal);
    expect(claims).toEqual({ app_role: 'platform_operator' });
    expect(claims).not.toHaveProperty('restaurant_id');
    expect(claims).not.toHaveProperty('location_id');
  });
});

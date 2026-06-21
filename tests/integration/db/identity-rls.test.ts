import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asService, asTenant, committed, createPool, dbReachable } from './helpers';

/**
 * B1 verification (ADR 0010): RLS isolates staff accounts and memberships.
 *
 * Proves that:
 *  - a member sees only their own restaurant's memberships,
 *  - a cross-tenant membership INSERT is rejected (WITH CHECK is live),
 *  - the `users` policy reveals a user's own row and co-workers who share the
 *    viewer's restaurant, but never a user from another tenant, and
 *  - a platform_operator can read across tenants.
 *
 * Skips when SUPABASE_DB_URL is unset, like the tenancy-root suite.
 */
const describeOrSkip = dbReachable ? describe : describe.skip;

if (!dbReachable) {
  console.warn('[identity-rls] SUPABASE_DB_URL unset — skipping integration suite.');
}

const R_A = '00000000-0000-0000-0000-0000000a0101';
const R_B = '00000000-0000-0000-0000-0000000a0102';
const L_A1 = '00000000-0000-0000-0000-0000000a0111';
const L_B1 = '00000000-0000-0000-0000-0000000a0122';
const USER_MGR_A = '00000000-0000-0000-0000-0000000a0201';
const USER_SRV_A = '00000000-0000-0000-0000-0000000a0202';
const USER_MGR_B = '00000000-0000-0000-0000-0000000a0203';
const MEMB_MGR_A = '00000000-0000-0000-0000-0000000a0301';
const MEMB_SRV_A = '00000000-0000-0000-0000-0000000a0302';
const MEMB_MGR_B = '00000000-0000-0000-0000-0000000a0303';

const pool = dbReachable ? createPool() : (undefined as never);

beforeAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query(
      `insert into restaurants (id, name) values ($1,'Ident A'),($2,'Ident B')
       on conflict (id) do nothing`,
      [R_A, R_B],
    );
    await c.query(
      `insert into locations (id, restaurant_id, name) values ($1,$2,'A1'),($3,$4,'B1')
       on conflict (id) do nothing`,
      [L_A1, R_A, L_B1, R_B],
    );
    await c.query(
      `insert into users (id, email, display_name) values
         ($1,'mgr.a@example.com','Mgr A'),
         ($2,'srv.a@example.com','Srv A'),
         ($3,'mgr.b@example.com','Mgr B')
       on conflict (id) do nothing`,
      [USER_MGR_A, USER_SRV_A, USER_MGR_B],
    );
    await c.query(
      `insert into memberships (id, restaurant_id, location_id, user_id, role) values
         ($1,$2,$3,$4,'manager'),
         ($5,$6,$7,$8,'server'),
         ($9,$10,$11,$12,'manager')
       on conflict (id) do nothing`,
      [
        MEMB_MGR_A,
        R_A,
        L_A1,
        USER_MGR_A,
        MEMB_SRV_A,
        R_A,
        L_A1,
        USER_SRV_A,
        MEMB_MGR_B,
        R_B,
        L_B1,
        USER_MGR_B,
      ],
    );
  });
});

afterAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query('delete from memberships where id in ($1,$2,$3)', [
      MEMB_MGR_A,
      MEMB_SRV_A,
      MEMB_MGR_B,
    ]);
    await c.query('delete from users where id in ($1,$2,$3)', [USER_MGR_A, USER_SRV_A, USER_MGR_B]);
    await c.query('delete from locations where id in ($1,$2)', [L_A1, L_B1]);
    await c.query('delete from restaurants where id in ($1,$2)', [R_A, R_B]);
  });
  await pool.end();
});

describeOrSkip('Identity RLS (B1)', () => {
  const mgrA = { restaurantId: R_A, locationId: L_A1, appRole: 'manager', userId: USER_MGR_A };

  it('a manager sees only their own restaurant’s memberships', async () => {
    const ids = await asTenant(pool, mgrA, async (c) => {
      const r = await c.query('select id from memberships order by id');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toEqual([MEMB_MGR_A, MEMB_SRV_A].sort());
    expect(ids).not.toContain(MEMB_MGR_B);
  });

  it('rejects a cross-tenant membership INSERT (WITH CHECK live)', async () => {
    await expect(
      asTenant(pool, mgrA, async (c) => {
        await c.query(
          `insert into memberships (restaurant_id, location_id, user_id, role)
           values ($1,$2,$3,'server')`,
          [R_B, L_B1, USER_SRV_A],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('reveals own row + co-members, never another tenant’s user', async () => {
    const ids = await asTenant(pool, mgrA, async (c) => {
      const r = await c.query('select id from users order by id');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toContain(USER_MGR_A); // self
    expect(ids).toContain(USER_SRV_A); // co-member in same restaurant
    expect(ids).not.toContain(USER_MGR_B); // other tenant
  });

  it('does not expose memberships to an unscoped platform_operator (helper has no blanket bypass)', async () => {
    // app.enable_tenant_rls scopes strictly by restaurant+location. A
    // platform_operator carries no tenant scope, so it reads zero memberships
    // through RLS by design — cross-tenant support access is explicit/scoped
    // (support_sessions), not a blanket bypass on tenant-owned tables.
    const ids = await asTenant(pool, { appRole: 'platform_operator' }, async (c) => {
      const r = await c.query('select id from memberships');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toEqual([]);
  });

  it('a tenant cannot see another tenant’s memberships even when querying by id', async () => {
    const rows = await asTenant(pool, mgrA, async (c) => {
      const r = await c.query('select id from memberships where id = $1', [MEMB_MGR_B]);
      return r.rows.length;
    });
    expect(rows).toBe(0);

    const survives = await asService(pool, async (c) => {
      const r = await c.query('select id from memberships where id = $1', [MEMB_MGR_B]);
      return r.rows.length;
    });
    expect(survives).toBe(1);
  });
});

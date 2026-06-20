import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asService, asTenant, committed, createPool, dbReachable } from './helpers';

/**
 * Automated cross-tenant negative test (ADR 0010 verification: "Automated
 * positive and negative RLS tests cover every role and tenant table").
 *
 * Asserts that the tenancy-root RLS baseline:
 *  - isolates tenant A from tenant B for every DML command,
 *  - denies by default when no claims are present (anonymous),
 *  - rejects cross-tenant INSERT/UPDATE with a row-level-security ERROR (not a
 *    silent 0-row effect), proving WITH CHECK is live, and
 *  - is immune to client-provided tenant IDs (RLS is independent of predicates).
 *
 * Skips the whole suite when SUPABASE_DB_URL is unset, so local unit runs and
 * PRs that don't touch the DB are unaffected.
 */
const describeOrSkip = dbReachable ? describe : describe.skip;

if (!dbReachable) {
  console.warn(
    '[rls-cross-tenant] SUPABASE_DB_URL unset — skipping integration suite (unit runs unaffected).',
  );
}

// Stable fixture UUIDs (also used by supabase/seed/dev.sql-free test seeding).
const RESTAURANT_A = '00000000-0000-0000-0000-000000000001';
const RESTAURANT_B = '00000000-0000-0000-0000-000000000002';
const LOCATION_A1 = '00000000-0000-0000-0000-000000000011';
const LOCATION_B1 = '00000000-0000-0000-0000-000000000022';
const ATTEMPTED_NEW_ID = '00000000-0000-0000-0000-000000000099';
// Representative downstream table proving app.enable_tenant_rls (the helper every
// module epic will call). It carries both restaurant_id and location_id.
const WIDGET_A = '00000000-0000-0000-0000-000000000031';
const WIDGET_B = '00000000-0000-0000-0000-000000000032';

const pool = dbReachable ? createPool() : (undefined as never);

beforeAll(async () => {
  if (!dbReachable) return;
  // Committed seed: two tenants, one location each. Persists across the
  // per-test asTenant transactions (which all roll back).
  await committed(pool, async (c) => {
    await c.query(
      `
      insert into restaurants (id, name) values
        ($1, 'Tenant A'), ($2, 'Tenant B')
      on conflict (id) do nothing
    `,
      [RESTAURANT_A, RESTAURANT_B],
    );
    await c.query(
      `
      insert into locations (id, restaurant_id, name) values
        ($1, $2, 'A1'), ($3, $4, 'B1')
      on conflict (id) do nothing
    `,
      [LOCATION_A1, RESTAURANT_A, LOCATION_B1, RESTAURANT_B],
    );

    // Representative downstream table that exercises app.enable_tenant_rls, the
    // reusable helper all module epics call. Created here (not in a migration)
    // so the shipped baseline stays at restaurants + locations while still
    // proving the helper end-to-end against a table with location_id.
    await c.query(`
      create table if not exists sample_widgets (
        id            uuid        primary key default gen_random_uuid(),
        restaurant_id uuid        not null references restaurants(id),
        location_id   uuid        not null references locations(id),
        name          text,
        created_at    timestamptz not null default now(),
        updated_at    timestamptz not null default now()
      );
      create trigger trg_sample_widgets_updated_at
        before update on sample_widgets
        for each row execute function app.set_updated_at();
      select app.enable_tenant_rls('sample_widgets'::regclass, p_has_location := true);
      grant select, insert, update, delete on sample_widgets to authenticated, anon;
    `);
    await c.query(
      `
      insert into sample_widgets (id, restaurant_id, location_id, name) values
        ($1, $2, $3, 'widget A'), ($4, $5, $6, 'widget B')
      on conflict (id) do nothing
    `,
      [WIDGET_A, RESTAURANT_A, LOCATION_A1, WIDGET_B, RESTAURANT_B, LOCATION_B1],
    );
  });
});

afterAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query('drop table if exists sample_widgets');
    await c.query('delete from locations where id in ($1, $2)', [LOCATION_A1, LOCATION_B1]);
    await c.query('delete from restaurants where id in ($1, $2)', [RESTAURANT_A, RESTAURANT_B]);
  });
  await pool.end();
});

describeOrSkip('RLS cross-tenant isolation (ADR 0010)', () => {
  it('a tenant reads its own location but not another tenant’s', async () => {
    const visible = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
      async (c) => {
        const own = await c.query('select id from locations where id = $1', [LOCATION_A1]);
        expect(own.rows).toHaveLength(1);

        // No WHERE clause: RLS is the only filter. Must return A1 and never B1.
        const all = await c.query('select id from locations');
        return (all.rows as { id: string }[]).map((r) => r.id);
      },
    );
    expect(visible).toEqual([LOCATION_A1]);
    expect(visible).not.toContain(LOCATION_B1);
  });

  it('denies by default when no claims are present (anonymous)', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role anon');
      // Intentionally do NOT set request.jwt.claims -> NULL scope -> deny-all.
      const restaurants = await client.query('select id from restaurants');
      const locations = await client.query('select id from locations');
      expect(restaurants.rows).toHaveLength(0);
      expect(locations.rows).toHaveLength(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('rejects a cross-tenant INSERT with a row-level-security error (WITH CHECK is live)', async () => {
    await expect(
      asTenant(
        pool,
        { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
        async (c) => {
          // Attempt to create a row in tenant B's scope from tenant A.
          await c.query('insert into locations (id, restaurant_id, name) values ($1, $2, $3)', [
            ATTEMPTED_NEW_ID,
            RESTAURANT_B,
            'sneaky',
          ]);
        },
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('rejects moving a row into another tenant’s scope on UPDATE', async () => {
    await expect(
      asTenant(
        pool,
        { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
        async (c) => {
          await c.query('update locations set restaurant_id = $1 where id = $2', [
            RESTAURANT_B,
            LOCATION_A1,
          ]);
        },
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('cannot DELETE another tenant’s row (invisible and untouched)', async () => {
    const deletedCount = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
      async (c) => {
        const res = await c.query('delete from locations where id = $1', [LOCATION_B1]);
        return res.rowCount ?? 0;
      },
    );
    expect(deletedCount).toBe(0);

    // Service role confirms B1 still exists (RLS didn't just hide the deletion).
    const survivors = await asService(pool, async (c) => {
      const r = await c.query('select id from locations where id = $1', [LOCATION_B1]);
      return r.rows.length;
    });
    expect(survivors).toBe(1);
  });

  it('ignores a client-provided tenant ID in the WHERE clause (RLS is independent of predicates)', async () => {
    const sneaky = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
      async (c) => {
        // Client asks for tenant B explicitly; RLS must still clamp to A -> none.
        const r = await c.query('select id from locations where restaurant_id = $1', [
          RESTAURANT_B,
        ]);
        return (r.rows as { id: string }[]).map((row) => row.id);
      },
    );
    expect(sneaky).toHaveLength(0);
  });

  it('platform_operator can read across all tenants', async () => {
    const seen = await asTenant(pool, { role: 'platform_operator' }, async (c) => {
      const r = await c.query('select id from restaurants order by id');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(seen).toEqual([RESTAURANT_A, RESTAURANT_B]);
  });

  it('app.enable_tenant_rls isolates a downstream table by restaurant AND location', async () => {
    // The reusable helper (not the hand-written root policies) must also isolate.
    const visible = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'server' },
      async (c) => {
        const r = await c.query('select id from sample_widgets');
        return (r.rows as { id: string }[]).map((row) => row.id);
      },
    );
    expect(visible).toEqual([WIDGET_A]);
    expect(visible).not.toContain(WIDGET_B);
  });

  it('app.enable_tenant_rls rejects a cross-tenant INSERT on a downstream table', async () => {
    await expect(
      asTenant(
        pool,
        { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'server' },
        async (c) => {
          await c.query(
            'insert into sample_widgets (restaurant_id, location_id, name) values ($1, $2, $3)',
            [RESTAURANT_B, LOCATION_B1, 'sneaky'],
          );
        },
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('does not expose the privileged DDL helper to client roles', async () => {
    // app.enable_tenant_rls is SECURITY DEFINER DDL; its EXECUTE privilege is
    // revoked from PUBLIC/authenticated/anon so only the migration owner may run
    // it. A client-reachable role must not be able to alter RLS on tables.
    await expect(
      asTenant(
        pool,
        { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, role: 'manager' },
        async (c) => {
          await c.query("select app.enable_tenant_rls('sample_widgets'::regclass, true)");
        },
      ),
    ).rejects.toThrow(/permission denied for function enable_tenant_rls/i);
  });
});

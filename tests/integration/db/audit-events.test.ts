import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asService, asTenant, committed, createPool, dbReachable } from './helpers';

/**
 * Append-only + tenant-isolation test for audit_events (A4, security-privacy.md
 * §7; migration 00000000000003).
 *
 * Proves:
 *  - Immutability is enforced by the BEFORE UPDATE OR DELETE trigger for EVERY
 *    role, including the service/owner role that bypasses RLS (RLS bypass does
 *    not skip triggers). This is the authoritative append-only guarantee.
 *  - WRITE restriction: clients cannot INSERT audit rows at all (service-role-
 *    only), so the trail is unforgeable.
 *  - READ isolation: a tenant reads only its own restaurant rows;
 *    platform_operator reads all; anon reads none.
 *  - WITH CHECK: a tenant cannot INSERT a row in another tenant's scope.
 *
 * Fixture UUIDs are in the 0x1xx range so this suite never collides with the
 * 0x0xx fixtures in rls-cross-tenant.test.ts when both run against one DB.
 * Skips when SUPABASE_DB_URL is unset.
 */
const describeOrSkip = dbReachable ? describe : describe.skip;

if (!dbReachable) {
  console.warn(
    '[audit-events] SUPABASE_DB_URL unset — skipping integration suite (unit runs unaffected).',
  );
}

const RESTAURANT_A = '00000000-0000-0000-0000-000000000101';
const RESTAURANT_B = '00000000-0000-0000-0000-000000000102';
const LOCATION_A1 = '00000000-0000-0000-0000-000000000111';
const AUDIT_A = '00000000-0000-0000-0000-0000000001a1';
const AUDIT_B = '00000000-0000-0000-0000-0000000001b1';

const pool = dbReachable ? createPool() : (undefined as never);

beforeAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query(
      `insert into restaurants (id, name) values ($1, 'A'), ($2, 'B') on conflict (id) do nothing`,
      [RESTAURANT_A, RESTAURANT_B],
    );
    await c.query(
      `insert into locations (id, restaurant_id, name) values ($1, $2, 'A1') on conflict (id) do nothing`,
      [LOCATION_A1, RESTAURANT_A],
    );
    await c.query(
      `
      insert into audit_events (id, restaurant_id, location_id, actor_type, actor_id, action, correlation_id, outcome)
      values ($1, $2, $3, 'service', 'seed', 'seed.test', 'corr_seed', 'success'),
             ($4, $5, null, 'service', 'seed', 'seed.test', 'corr_seed', 'success')
      on conflict (id) do nothing
      `,
      [AUDIT_A, RESTAURANT_A, LOCATION_A1, AUDIT_B, RESTAURANT_B],
    );
  });
});

afterAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    // audit_events is append-only by trigger, so DELETE is normally rejected
    // (the point of this suite). Suspend the trigger to remove the seeded rows,
    // then re-enable it. restaurants/locations delete normally.
    await c.query('alter table audit_events disable trigger trg_audit_events_immutable');
    await c.query('delete from audit_events where id in ($1, $2)', [AUDIT_A, AUDIT_B]);
    await c.query('alter table audit_events enable trigger trg_audit_events_immutable');
    await c.query('delete from locations where id = $1', [LOCATION_A1]);
    await c.query('delete from restaurants where id in ($1, $2)', [RESTAURANT_A, RESTAURANT_B]);
  });
  await pool.end();
});

describeOrSkip('audit_events append-only + RLS (A4)', () => {
  it('rejects UPDATE even for the service/owner role (trigger fires despite RLS bypass)', async () => {
    await expect(
      asService(pool, async (c) => {
        await c.query('update audit_events set action = $1 where id = $2', ['tampered', AUDIT_A]);
      }),
    ).rejects.toThrow(/audit_events is append-only/i);
  });

  it('rejects DELETE even for the service/owner role (trigger fires despite RLS bypass)', async () => {
    await expect(
      asService(pool, async (c) => {
        await c.query('delete from audit_events where id = $1', [AUDIT_A]);
      }),
    ).rejects.toThrow(/audit_events is append-only/i);
  });

  it('rejects TRUNCATE even for the service/owner role (statement trigger)', async () => {
    // TRUNCATE is neither UPDATE nor DELETE; without the statement trigger a
    // privileged process could wipe the whole trail. It must be rejected too.
    await expect(
      asService(pool, async (c) => {
        await c.query('truncate audit_events');
      }),
    ).rejects.toThrow(/audit_events is append-only/i);
  });

  it('a manager reads only its own restaurant audit rows', async () => {
    const ids = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, appRole: 'manager' },
      async (c) => {
        const r = await c.query('select id from audit_events');
        return (r.rows as { id: string }[]).map((row) => row.id);
      },
    );
    expect(ids).toEqual([AUDIT_A]);
    expect(ids).not.toContain(AUDIT_B);
  });

  it('a server gets no audit read (oversight is owner/manager only)', async () => {
    const ids = await asTenant(
      pool,
      { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, appRole: 'server' },
      async (c) => {
        const r = await c.query('select id from audit_events');
        return (r.rows as { id: string }[]).map((row) => row.id);
      },
    );
    expect(ids).toEqual([]);
  });

  it('platform_operator reads audit rows across tenants', async () => {
    const ids = await asTenant(pool, { appRole: 'platform_operator' }, async (c) => {
      const r = await c.query('select id from audit_events order by id');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toContain(AUDIT_A);
    expect(ids).toContain(AUDIT_B);
  });

  it('anon cannot even read the table (no SELECT grant — not just empty via RLS)', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role anon');
      await expect(client.query('select id from audit_events')).rejects.toThrow(
        /permission denied/i,
      );
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('rejects ANY client INSERT — audit is write-restricted to the service role', async () => {
    // Even an own-scope insert by a tenant is denied: clients have no INSERT
    // privilege, so they cannot forge audit records (wrong actor, fake outcome).
    await expect(
      asTenant(
        pool,
        { restaurantId: RESTAURANT_A, locationId: LOCATION_A1, appRole: 'manager' },
        async (c) => {
          await c.query(
            `insert into audit_events (restaurant_id, actor_type, actor_id, action, correlation_id, outcome)
             values ($1, 'user', 'u', 'forged', 'corr_x', 'success')`,
            [RESTAURANT_A],
          );
        },
      ),
    ).rejects.toThrow(/permission denied|row-level security/i);
  });
});

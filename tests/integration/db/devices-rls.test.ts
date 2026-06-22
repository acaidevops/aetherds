import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asService, asTenant, committed, createPool, dbReachable } from './helpers';

/**
 * B2 verification (ADR 0010): RLS isolates devices/tables and locks down the
 * credential store.
 *
 * Proves:
 *  - a member reads only its own location's devices/tables,
 *  - clients cannot write devices (provisioning is a service-role command),
 *  - device_credentials is unreadable by ANY client role (secret store), and
 *  - a device principal (device_id claim) reads its own bound device row.
 *
 * Skips when SUPABASE_DB_URL is unset.
 */
const describeOrSkip = dbReachable ? describe : describe.skip;
if (!dbReachable) console.warn('[devices-rls] SUPABASE_DB_URL unset — skipping integration suite.');

const R_A = '00000000-0000-0000-0000-0000000b0101';
const R_B = '00000000-0000-0000-0000-0000000b0102';
const L_A1 = '00000000-0000-0000-0000-0000000b0111';
const L_B1 = '00000000-0000-0000-0000-0000000b0122';
const TABLE_A = '00000000-0000-0000-0000-0000000b0201';
const DEVICE_A = '00000000-0000-0000-0000-0000000b0301';
const DEVICE_B = '00000000-0000-0000-0000-0000000b0302';

const pool = dbReachable ? createPool() : (undefined as never);

beforeAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query(
      `insert into restaurants (id, name) values ($1,'DevA'),($2,'DevB') on conflict (id) do nothing`,
      [R_A, R_B],
    );
    await c.query(
      `insert into locations (id, restaurant_id, name) values ($1,$2,'A1'),($3,$4,'B1') on conflict (id) do nothing`,
      [L_A1, R_A, L_B1, R_B],
    );
    await c.query(
      `insert into tables (id, restaurant_id, location_id, display_number) values ($1,$2,$3,'1') on conflict (id) do nothing`,
      [TABLE_A, R_A, L_A1],
    );
    await c.query(
      `insert into devices (id, restaurant_id, location_id, default_table_id, status) values
         ($1,$2,$3,$4,'active'),($5,$6,$7,null,'active') on conflict (id) do nothing`,
      [DEVICE_A, R_A, L_A1, TABLE_A, DEVICE_B, R_B, L_B1],
    );
    await c.query(
      `insert into device_credentials (device_id, token_hash) values ($1,'hash_a') on conflict do nothing`,
      [DEVICE_A],
    );
  });
});

afterAll(async () => {
  if (!dbReachable) return;
  await committed(pool, async (c) => {
    await c.query('delete from device_credentials where device_id in ($1,$2)', [
      DEVICE_A,
      DEVICE_B,
    ]);
    await c.query('delete from devices where id in ($1,$2)', [DEVICE_A, DEVICE_B]);
    await c.query('delete from tables where id = $1', [TABLE_A]);
    await c.query('delete from locations where id in ($1,$2)', [L_A1, L_B1]);
    await c.query('delete from restaurants where id in ($1,$2)', [R_A, R_B]);
  });
  await pool.end();
});

describeOrSkip('Devices RLS (B2)', () => {
  const mgrA = { restaurantId: R_A, locationId: L_A1, appRole: 'manager' };

  it('a member reads only its own location’s devices', async () => {
    const ids = await asTenant(pool, mgrA, async (c) => {
      const r = await c.query('select id from devices');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toEqual([DEVICE_A]);
    expect(ids).not.toContain(DEVICE_B);
  });

  it('a member reads its own location’s tables', async () => {
    const ids = await asTenant(pool, mgrA, async (c) => {
      const r = await c.query('select id from tables');
      return (r.rows as { id: string }[]).map((row) => row.id);
    });
    expect(ids).toEqual([TABLE_A]);
  });

  it('clients cannot write devices (provisioning is service-role only)', async () => {
    await expect(
      asTenant(pool, mgrA, async (c) => {
        await c.query(
          `insert into devices (restaurant_id, location_id, status) values ($1,$2,'active')`,
          [R_A, L_A1],
        );
      }),
    ).rejects.toThrow(/permission denied|row-level security/i);
  });

  it('device_credentials is unreadable by any client (secret store)', async () => {
    await expect(
      asTenant(pool, mgrA, async (c) => {
        await c.query('select token_hash from device_credentials');
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  it('a device principal reads its own bound device row', async () => {
    const ids = await asTenant(
      pool,
      { restaurantId: R_A, locationId: L_A1, appRole: 'device', deviceId: DEVICE_A },
      async (c) => {
        const r = await c.query('select id from devices');
        return (r.rows as { id: string }[]).map((row) => row.id);
      },
    );
    expect(ids).toEqual([DEVICE_A]);
  });

  it('the service role still reads credentials (for verification)', async () => {
    const count = await asService(pool, async (c) => {
      const r = await c.query('select id from device_credentials where device_id = $1', [DEVICE_A]);
      return r.rows.length;
    });
    expect(count).toBe(1);
  });
});

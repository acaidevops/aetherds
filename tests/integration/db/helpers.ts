import { Pool, type PoolClient } from 'pg';

/**
 * Integration-test harness for tenant-isolation RLS (ADR 0010 / 0012).
 *
 * `asTenant` connects as a non-bypass principal (`authenticated`) with
 * `request.jwt.claims` set locally to the transaction, so Postgres enforces RLS
 * exactly as PostgREST would in production. `asService` runs as the table owner
 * (RLS bypassed) for fixture setup. All work is wrapped in a transaction that is
 * rolled back, so tests never persist writes.
 *
 * REQUIREMENT: the connection user must be able to `SET ROLE authenticated`
 * (i.e. be a superuser or a member of the role). The CI `postgres:16` service
 * and the local Supabase dev DB both connect as the `postgres` superuser.
 */

const url = process.env.SUPABASE_DB_URL;

/** True when a database URL is configured. Tests skip (gracefully) when false. */
export const dbReachable = Boolean(url);

export function createPool(): Pool {
  if (!url) {
    throw new Error('SUPABASE_DB_URL must be set for integration tests.');
  }
  return new Pool({ connectionString: url });
}

export interface TenantClaims {
  /** Tenant root scope; absent for platform-wide principals (platform_operator). */
  restaurantId?: string;
  /** Location scope within the restaurant when applicable. */
  locationId?: string;
  /** AETHER application role; carried as the `app_role` claim (NOT `role`). */
  appRole: string;
  deviceId?: string;
}

/**
 * Run `body` as a tenant principal (non-bypass role + JWT claims). RLS applies.
 * The transaction is rolled back at the end so nothing persists.
 *
 * The JWT carries `role: 'authenticated'` (the Supabase/PostgREST-reserved DB
 * role) plus the AETHER application role under `app_role` — mirroring a real
 * production token. The DB role is fixed via `set local role authenticated`
 * regardless of the claim (PostgREST does that step in production).
 */
export async function asTenant<T>(
  pool: Pool,
  claims: TenantClaims,
  body: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    // SET ROLE to a non-bypass principal so RLS is enforced (the table owner and
    // superusers bypass RLS). `set local` scopes it to this transaction.
    await client.query('set local role authenticated');
    const jwt = {
      restaurant_id: claims.restaurantId ?? null,
      location_id: claims.locationId ?? null,
      // `role` is Supabase-reserved (PostgREST uses it to SET ROLE); the AETHER
      // app role lives in `app_role`, which app.current_role() reads.
      role: 'authenticated',
      app_role: claims.appRole,
      device_id: claims.deviceId ?? null,
    };
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(jwt)]);
    const result = await body(client);
    await client.query('rollback');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run `body` as the table owner / superuser. RLS is bypassed, so this is how
 * fixtures and cross-tenant assertions are seeded and verified. Rolls back.
 */
export async function asService<T>(
  pool: Pool,
  body: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await body(client);
    await client.query('rollback');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run `body` and COMMIT it. Used by beforeAll/afterAll for seed data that must
 * persist across the per-test `asTenant` transactions.
 */
export async function committed<T>(
  pool: Pool,
  body: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await body(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

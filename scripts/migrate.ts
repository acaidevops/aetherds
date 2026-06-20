/**
 * Portable database migration runner (A3 baseline).
 *
 * Applies every `supabase/migrations/*.sql` in filename order. The same files
 * are applied by `supabase db push` against real Supabase, so this runner is
 * what lets CI validate migrations against a plain `postgres:16` service with no
 * Docker/PostgREST/Auth dependency.
 *
 * Design notes:
 * - Idempotent across re-runs: a `public.aether_migrations` history table tracks
 *   applied filenames, so already-applied files are skipped. (This is the
 *   runner's own bookkeeping, separate from Supabase's
 *   `supabase_migrations.schema_migrations`; real environments use
 *   `supabase db push`.) Expect either a fresh database or one this runner has
 *   migrated before. The history table also stores a SHA-256 checksum of each
 *   applied file's contents, so editing an already-applied migration is
 *   detected and fails loudly rather than silently skipping the new SQL (which
 *   would leave a reused local/staging DB on a schema different from the repo).
 * - Each migration file runs in its OWN transaction (not one mega-transaction):
 *   this matches Supabase CLI semantics and survives future non-transactional
 *   DDL (e.g. CREATE INDEX CONCURRENTLY).
 * - Role bootstrap (authenticated/anon) lives here, not in migration files, so
 *   the migration SQL stays Supabase-pure (Supabase owns those roles in prod;
 *   CI gets them from this runner).
 *
 * Run via `npm run db:migrate`. Never imported by application code under `src/`
 * (the `pg` dependency is server/tooling-only; eslint enforces the boundary).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Pool } from 'pg';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const HISTORY_TABLE = 'public.aether_migrations';

/** Roles + the migration-history table. Idempotent; safe on a fresh or reused DB. */
async function bootstrap(pool: Pool): Promise<void> {
  // authenticated/anon exist in real Supabase; create them idempotently for the
  // plain-Postgres CI path so RLS test connections can SET ROLE to a non-bypass
  // principal.
  await pool.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated noinherit;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon noinherit;
      end if;
    end
    $$;
  `);

  await pool.query(`
    create table if not exists ${HISTORY_TABLE} (
      filename   text        primary key,
      checksum   text,
      applied_at timestamptz not null default now()
    );
  `);
  // Backfill the checksum column for history tables created before it existed.
  await pool.query(`alter table ${HISTORY_TABLE} add column if not exists checksum text`);
}

/** SHA-256 of a migration file's contents, used to detect post-apply edits. */
function checksumOf(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

async function appliedFiles(pool: Pool): Promise<Map<string, string | null>> {
  const result = await pool.query<{ filename: string; checksum: string | null }>(
    `select filename, checksum from ${HISTORY_TABLE}`,
  );
  return new Map(result.rows.map((r) => [r.filename, r.checksum]));
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is required to run migrations.');
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No .sql migrations found in ${MIGRATIONS_DIR}.`);
  }

  const pool = new Pool({ connectionString: url });
  try {
    await bootstrap(pool);
    const applied = await appliedFiles(pool);

    // Fail loudly if an already-applied migration's contents changed on disk.
    // (Legacy rows with a null checksum predate this column and are skipped.)
    for (const file of files) {
      if (!applied.has(file)) continue;
      const recorded = applied.get(file);
      if (recorded == null) continue;
      const current = checksumOf(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
      if (current !== recorded) {
        throw new Error(
          `Applied migration ${file} has been edited since it was applied ` +
            `(checksum ${recorded.slice(0, 12)}… -> ${current.slice(0, 12)}…). ` +
            `Migrations are immutable once applied; add a new migration instead, ` +
            `or reset the database to re-apply from scratch.`,
        );
      }
    }

    const pending = files.filter((f) => !applied.has(f));

    console.log(
      `[migrate] ${pending.length} pending / ${applied.size} already applied ` +
        `(of ${files.length}) -> ${redactUrl(url)}`,
    );

    for (const file of pending) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query(`insert into ${HISTORY_TABLE} (filename, checksum) values ($1, $2)`, [
          file,
          checksumOf(sql),
        ]);
        await client.query('commit');
        console.log(`[migrate]   ✓ ${file}`);
      } catch (cause) {
        await client.query('rollback').catch(() => undefined);
        throw new Error(`Migration ${file} failed: ${(cause as Error).message}`, {
          cause,
        });
      } finally {
        client.release();
      }
    }

    console.log('[migrate] done.');
  } finally {
    await pool.end();
  }
}

/** Strip credentials from a connection string before logging it. */
function redactUrl(url: string): string {
  return url.replace(/:\/\/[^@]*@/, '://***:***@');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

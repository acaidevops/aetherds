-- A3 baseline: shared application schema, JWT-claim tenant helpers, and the
-- reusable RLS-enabling helper (ADR 0010 / ADR 0012).
--
-- This file is portable: it applies identically via `supabase db push` (real
-- Supabase) and via the plain-Postgres runner (scripts/migrate.ts, used in CI).
-- Role creation (authenticated/anon) is intentionally NOT done here — it is
-- bootstrapped by the runner in CI and provided by Supabase in production, so
-- migration files stay Supabase-pure.

-- pgcrypto provides gen_random_uuid(). Supabase preloads it; plain-Postgres CI
-- may not. CREATE EXTENSION IF NOT EXISTS is safe and idempotent in both.
-- (PG13+ also exposes gen_random_uuid() in pg_catalog, but declaring the
-- extension is the unambiguous, portable form.)
create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Tenant scope helpers.
--
-- Scope is read from the PostgREST/Supabase JWT GUC `request.jwt.claims`, the
-- same setting Supabase's own auth.jwt() reads (it is a thin wrapper over this
-- GUC). In production PostgREST sets it from the verified JWT before RLS runs;
-- in tests we set it with set_config('request.jwt.claims', '<json>', true).
--
-- current_setting(..., true) returns NULL when unset (anonymous / no-request
-- context) and NULL::jsonb yields NULL for every claim -> every tenant
-- predicate fails -> deny-by-default. The nullif guards against the GUC being
-- set to '' (which would fail the jsonb cast before the claim lookup).
--
-- These functions only read a GUC, so they are SECURITY INVOKER (the default).
-- `set search_path` hardens resolution of the jsonb operators.
--
-- IMPORTANT — claim names: the JWT `role` claim is RESERVED by Supabase/
-- PostgREST: PostgREST reads it to SET ROLE to a database role, so every real
-- user carries `role: 'authenticated'` (anon key: `role: 'anon'`). The AETHER
-- application role (manager/server/platform_operator/...) MUST live in a
-- separate `app_role` claim. app.current_role() therefore reads `app_role`;
-- reading `role` would return 'authenticated' for everyone in production and
-- break the platform_operator policies (and a token minted with
-- `role: 'manager'` would make PostgREST try SET ROLE to a nonexistent DB role).
-- ---------------------------------------------------------------------------

create or replace function app.current_restaurant_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'restaurant_id')::uuid
$$;

create or replace function app.current_location_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'location_id')::uuid
$$;

create or replace function app.current_role()
returns text
language sql
stable
set search_path = app, public
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role'
$$;

create or replace function app.current_device_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'device_id')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger.
--
-- Every tenant table attaches this in its own migration:
--   create trigger trg_<table>_updated_at before update on <table>
--     for each row execute function app.set_updated_at();
-- ---------------------------------------------------------------------------

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = app, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reusable tenant-isolation RLS enabler (ADR 0012).
--
-- Module epics call this instead of hand-writing policy SQL. It enables RLS on
-- the target table (deny-by-default) and creates four per-command policies
-- (select/insert/update/delete), each scoped by restaurant_id and, when
-- p_has_location is true, additionally by location_id. Both USING and WITH
-- CHECK carry the predicate, so cross-tenant INSERT/UPDATE are rejected with a
-- row-level-security error rather than silently hidden.
--
-- SECURITY DEFINER is required because the function issues ALTER TABLE and
-- CREATE POLICY, which need ownership of the target table; the function owner
-- is the migration runner (table owner). `set search_path` prevents search_path
-- injection when the predicate resolves app.current_restaurant_id().
--
-- The only caller inputs are p_table (regclass, catalog-validated) and p_prefix
-- (a name passed through %I). The predicate string is built from fixed
-- literals we control — there is no injection surface.
-- ---------------------------------------------------------------------------

create or replace function app.enable_tenant_rls(
  p_table        regclass,
  p_has_location boolean default false,
  p_prefix       text    default null
)
returns void
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_prefix    text := coalesce(p_prefix, replace(p_table::text, '.', '_'));
  v_predicate text := format(
    'restaurant_id = app.current_restaurant_id()%s',
    case when p_has_location then ' and location_id = app.current_location_id()' else '' end
  );
begin
  execute format('alter table %s enable row level security', p_table);

  -- Drop-then-create keeps the helper idempotent (CREATE POLICY has no IF NOT
  -- EXISTS). Policy names embed the table prefix so they never collide.
  execute format('drop policy if exists %I on %s', v_prefix || '_tenant_select', p_table);
  execute format('create policy %I on %s for select using (%s)',
                 v_prefix || '_tenant_select', p_table, v_predicate);

  execute format('drop policy if exists %I on %s', v_prefix || '_tenant_insert', p_table);
  execute format('create policy %I on %s for insert with check (%s)',
                 v_prefix || '_tenant_insert', p_table, v_predicate);

  execute format('drop policy if exists %I on %s', v_prefix || '_tenant_update', p_table);
  execute format('create policy %I on %s for update using (%s) with check (%s)',
                 v_prefix || '_tenant_update', p_table, v_predicate, v_predicate);

  execute format('drop policy if exists %I on %s', v_prefix || '_tenant_delete', p_table);
  execute format('create policy %I on %s for delete using (%s)',
                 v_prefix || '_tenant_delete', p_table, v_predicate);
end;
$$;

-- SECURITY: SECURITY DEFINER functions are executable by PUBLIC by default.
-- authenticated/anon hold USAGE on schema app, so without this revocation a
-- client-reachable role could invoke this privileged DDL helper directly
-- (ALTER TABLE / CREATE POLICY). Restrict execution to the migration owner
-- only. The claim-reader helpers above stay PUBLIC-executable because RLS
-- policy evaluation calls them at query time.
revoke all on function app.enable_tenant_rls(regclass, boolean, text) from public;
revoke all on function app.enable_tenant_rls(regclass, boolean, text) from authenticated, anon;


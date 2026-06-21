-- B1: staff accounts and location memberships (ADR 0010).
--
-- Adds individual staff accounts (`users`) and the location membership/role
-- grant (`memberships`) that authorizes them. Authentication is owned by
-- Supabase Auth (auth.users); this `users` table is the application profile,
-- keyed by the same id (the JWT `sub`). Migrations stay Supabase-pure and
-- portable to plain-Postgres CI, so we do NOT reference auth.users here.
--
-- MVP scope note: each membership carries exactly one role per location. The
-- domain model lists a separate `role_assignments` table for future multi-role
-- grants; that refinement is deferred and not required by B1.
--
-- Ordering: both tables are created first, THEN policies — the `users` read
-- policy references `memberships`, so that table must already exist.

-- ---------------------------------------------------------------------------
-- Current user helper.
--
-- Supabase puts the authenticated user id in the JWT `sub` claim (auth.uid()
-- reads the same value). Added here, additively, alongside the A3 claim helpers.
-- ---------------------------------------------------------------------------

create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Tables.
-- ---------------------------------------------------------------------------

-- users: individual staff accounts (application profile for auth.users). Not a
-- tenant-owned table — a user may hold memberships in more than one restaurant.
create table if not exists users (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null unique,
  display_name text,
  status       text        not null default 'active'
                 check (status in ('active', 'suspended')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_users_updated_at
  before update on users
  for each row execute function app.set_updated_at();

-- memberships: authorizes a user for a location with a single role. Tenant-owned
-- (restaurant_id + location_id). platform_operator is a platform-wide JWT role,
-- never a membership row, so it is excluded from the role check.
create table if not exists memberships (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references restaurants(id),
  location_id   uuid        not null references locations(id),
  user_id       uuid        not null references users(id),
  role          text        not null
                  check (role in ('owner', 'manager', 'server', 'food_safety_approver')),
  status        text        not null default 'active'
                  check (status in ('active', 'suspended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One membership (one role) per user per location.
  unique (user_id, location_id)
);

create index if not exists idx_memberships_restaurant_id on memberships(restaurant_id);
create index if not exists idx_memberships_location_id on memberships(location_id);
create index if not exists idx_memberships_user_id on memberships(user_id);

create trigger trg_memberships_updated_at
  before update on memberships
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS policies (tables now exist, so cross-references resolve).
-- ---------------------------------------------------------------------------

-- memberships: reusable deny-by-default tenant isolation (restaurant+location).
select app.enable_tenant_rls('memberships'::regclass, p_has_location := true);

-- users visibility:
--   * a user always sees their own row,
--   * a platform_operator sees all rows (audited support),
--   * a staff member sees co-workers who share one of their restaurants (via a
--     membership), so manager/server dashboards can show real names without
--     leaking unrelated users across tenants.
alter table users enable row level security;

create policy users_read on users
  for select
  using (
        id = app.current_user_id()
    or  app.current_role() = 'platform_operator'
    or  exists (
          select 1 from memberships m
          where m.user_id = users.id
            and m.restaurant_id = app.current_restaurant_id()
        )
  );

-- Write: a user may maintain their own profile; platform support may write any.
-- Account CREATION happens server-side via the Supabase admin path (service
-- role, RLS-exempt) — clients never insert arbitrary accounts.
create policy users_self_write on users
  for update
  using (id = app.current_user_id() or app.current_role() = 'platform_operator')
  with check (id = app.current_user_id() or app.current_role() = 'platform_operator');

create policy users_platform_insert on users
  for insert
  with check (app.current_role() = 'platform_operator');

create policy users_platform_delete on users
  for delete
  using (app.current_role() = 'platform_operator');

-- ---------------------------------------------------------------------------
-- Privileges. RLS filters rows, but the client-reachable roles still need table
-- privileges to reach policy evaluation (required in plain-Postgres CI;
-- complements Supabase defaults in production). Idempotent.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on users, memberships to authenticated, anon;

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

-- memberships: tenant-isolated, but READ-ONLY to client roles.
--
-- We deliberately do NOT use app.enable_tenant_rls here: that helper grants
-- scoped principals INSERT/UPDATE/DELETE, which would let a server promote their
-- own membership to owner, create memberships, or revoke coworkers directly
-- through PostgREST. Membership lifecycle (grant/revoke/change-role) is a
-- privileged SERVER command — performed with the service-role client (RLS-
-- exempt) and gated by role + step-up reauthentication (authorizeStaffCommand).
-- Clients may only READ memberships within their own scope; the missing write
-- policies (plus select-only grants below) deny every client write.
alter table memberships enable row level security;

create policy memberships_tenant_read on memberships
  for select
  using (
        (restaurant_id = app.current_restaurant_id() and location_id = app.current_location_id())
  );

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

-- Write: a user may update only their OWN row. Which COLUMNS they can change is
-- constrained by the column-level grant below (display_name only) — the row
-- policy alone cannot restrict columns. Sensitive fields (email, status) and
-- account creation/deactivation are privileged SERVER operations performed with
-- the service-role client (RLS-exempt); clients can never self-promote a
-- suspended account back to active or change their email.
create policy users_self_profile_update on users
  for update
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- Privileges. RLS filters rows, but the client-reachable roles still need table
-- privileges to reach policy evaluation (required in plain-Postgres CI;
-- complements Supabase defaults in production). Idempotent.
--
-- memberships: SELECT only — all writes go through service-role server commands.
-- users: SELECT plus a COLUMN-SCOPED update on display_name only, so email and
-- status can never be changed by a client even though the row policy matches.
-- INSERT/DELETE on users are not granted to client roles (account lifecycle is
-- service-role only).
-- ---------------------------------------------------------------------------

grant select on memberships to authenticated, anon;
grant select on users to authenticated, anon;
grant update (display_name) on users to authenticated, anon;

-- A3 baseline: tenancy root tables with deny-by-default RLS (ADR 0010 / 0012).
--
-- `restaurants` is the tenant root — it has no restaurant_id column (it IS the
-- tenant), so it gets an explicit policy: a member sees its own row, and a
-- platform_operator sees all rows. `locations` is the first tenant-owned table
-- and the reference for the app.enable_tenant_rls pattern every module epic
-- will follow.

-- ---------------------------------------------------------------------------
-- restaurants: tenant root.
-- ---------------------------------------------------------------------------

create table if not exists restaurants (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_restaurants_updated_at
  before update on restaurants
  for each row execute function app.set_updated_at();

alter table restaurants enable row level security;

-- A member sees the restaurant their scope resolves to; platform support sees
-- all restaurants. Both USING and WITH CHECK carry the same predicate so a
-- cross-tenant INSERT/UPDATE of a restaurant row is rejected.
create policy restaurants_tenant_isolation on restaurants
  for all
  using (
        app.current_restaurant_id() = id
    or  app.current_role() = 'platform_operator'
  )
  with check (
        app.current_restaurant_id() = id
    or  app.current_role() = 'platform_operator'
  );

-- ---------------------------------------------------------------------------
-- locations: first tenant-owned table (restaurant-scoped + location-scoped).
-- ---------------------------------------------------------------------------

create table if not exists locations (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references restaurants(id),
  name          text,
  timezone      text,
  currency      char(3),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_locations_restaurant_id on locations(restaurant_id);

create trigger trg_locations_updated_at
  before update on locations
  for each row execute function app.set_updated_at();

-- locations is the location ROOT: its location identity is its own primary key
-- (`id`), so there is no separate `location_id` column to scope on. It therefore
-- uses an explicit policy (restaurant match + own-id match), NOT the generic
-- app.enable_tenant_rls helper. That helper is reserved for downstream tables
-- that carry both restaurant_id and a location_id FK to a parent location
-- (tables, devices, dining_sessions, ...).
alter table locations enable row level security;

create policy locations_tenant_isolation on locations
  for all
  using (
        (restaurant_id = app.current_restaurant_id() and id = app.current_location_id())
    or  app.current_role() = 'platform_operator'
  )
  with check (
        (restaurant_id = app.current_restaurant_id() and id = app.current_location_id())
    or  app.current_role() = 'platform_operator'
  );

-- ---------------------------------------------------------------------------
-- Privileges.
--
-- RLS filters rows, but the requesting role must still hold table privileges to
-- reach RLS evaluation. Grant the client-reachable roles (authenticated, anon)
-- DML on the tenant tables and USAGE on the app schema (the claim helpers are
-- invoked during policy evaluation). In real Supabase these grants complement
-- the platform defaults; in plain-Postgres CI they are required. Idempotent.
-- ---------------------------------------------------------------------------

grant usage on schema app to authenticated, anon;
grant select, insert, update, delete
  on restaurants, locations
  to authenticated, anon;

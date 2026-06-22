-- B2: device provisioning and revocation (ADR 0008, ADR 0010).
--
-- A device is a REVOCABLE guest-tablet identity bound to one location and a
-- default table — never a user account (ADR 0008). Three tables:
--   * tables             — minimal table identity for default-table binding.
--                          B3 extends it with sections/assignments; B2 needs
--                          only the row so a device can bind to it.
--   * devices            — the provisioned device, its status, and binding.
--   * device_credentials — the revocable secret, stored ONLY as a hash.
--
-- Writes for all three are service-role-only (privileged manager commands go
-- through the application layer gated by role + step-up reauth — B1), so no
-- client can provision/revoke/rebind a device by hitting PostgREST directly.
-- device_credentials is additionally NOT readable by any client: only the
-- server verifies presented credentials against the stored hashes.

-- ---------------------------------------------------------------------------
-- tables: minimal table identity (B3 extends).
-- ---------------------------------------------------------------------------
create table if not exists tables (
  id             uuid        primary key default gen_random_uuid(),
  restaurant_id  uuid        not null references restaurants(id),
  location_id    uuid        not null references locations(id),
  display_number text        not null,
  status         text        not null default 'active'
                   check (status in ('active', 'inactive')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Display number is unique per location (domain-model invariant, B3).
  unique (location_id, display_number)
);

create index if not exists idx_tables_restaurant_id on tables(restaurant_id);
create index if not exists idx_tables_location_id on tables(location_id);

create trigger trg_tables_updated_at
  before update on tables
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- devices: provisioned tablet identity, bound to a default table.
-- ---------------------------------------------------------------------------
create table if not exists devices (
  id              uuid        primary key default gen_random_uuid(),
  restaurant_id   uuid        not null references restaurants(id),
  location_id     uuid        not null references locations(id),
  default_table_id uuid       references tables(id),
  label           text,
  status          text        not null default 'active'
                    check (status in ('active', 'quarantined', 'revoked')),
  provisioned_by  uuid        references users(id),
  provisioned_at  timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_devices_restaurant_id on devices(restaurant_id);
create index if not exists idx_devices_location_id on devices(location_id);
create index if not exists idx_devices_default_table_id on devices(default_table_id);

create trigger trg_devices_updated_at
  before update on devices
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- device_credentials: the revocable secret, stored as a hash only.
--
-- The plaintext credential is shown to the manager ONCE at provisioning and
-- never stored; only sha-256(token) lives here. Reassignment/revocation marks
-- the active credential revoked and (for reassignment) issues a new one, so the
-- prior capability is invalidated. This table holds secret material, so it is
-- NOT tenant-readable — no client grant, no policy; only the service role reads
-- it to verify a presented credential.
-- ---------------------------------------------------------------------------
create table if not exists device_credentials (
  id          uuid        primary key default gen_random_uuid(),
  device_id   uuid        not null references devices(id),
  token_hash  text        not null unique,
  status      text        not null default 'active'
                check (status in ('active', 'revoked')),
  issued_at   timestamptz not null default now(),
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_device_credentials_device_id on device_credentials(device_id);
-- Partial index: at most one ACTIVE credential per device is the norm; this
-- speeds the auth lookup and the "one active credential" expectation.
create index if not exists idx_device_credentials_active
  on device_credentials(device_id) where status = 'active';

create trigger trg_device_credentials_updated_at
  before update on device_credentials
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS.
-- tables + devices: tenant-scoped READ (restaurant+location), no client writes.
-- device_credentials: no client access at all (server-only secret store).
-- ---------------------------------------------------------------------------
alter table tables enable row level security;
create policy tables_tenant_read on tables
  for select
  using (restaurant_id = app.current_restaurant_id() and location_id = app.current_location_id());

alter table devices enable row level security;
create policy devices_tenant_read on devices
  for select
  using (restaurant_id = app.current_restaurant_id() and location_id = app.current_location_id());

-- device_credentials: RLS on, NO policy -> deny all for client roles. The
-- service role bypasses RLS; clients additionally get no table grant below.
alter table device_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges. tables/devices are client-readable (RLS-scoped); all writes are
-- service-role-only. device_credentials is granted to NO client role.
-- ---------------------------------------------------------------------------
grant select on tables to authenticated, anon;
grant select on devices to authenticated, anon;

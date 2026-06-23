-- D3: Menu import and normalization schema (ADR 0006: Menu Ownership).
--
-- This migration establishes the three-table foundation for menu sync:
--   1. spoton_menu_snapshots: immutable raw provider data (diagnosis)
--   2. menu_mappings: stable AETHER ↔ SpotOn ID mappings (survive provider changes)
--   3. sync_cursors: per-location version tracking and freshness monitoring
--
-- Design principles (from ADR 0006 and acceptance criteria):
--   * Immutable snapshots: raw provider data preserved for diagnosis
--   * Stable mappings: AETHER IDs decouple from provider IDs
--   * Never guess: broken mappings flagged explicitly, never auto-remapped
--   * Unpublished by default: new items remain unpublished until enriched
--   * Tenant isolation: full RLS on all tables using established patterns

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

create type menu_entity_type as enum ('category', 'item', 'modifier');
create type menu_mapping_status as enum ('active', 'broken', 'archived');
create type menu_sync_status as enum ('fresh', 'stale', 'error');

-- ---------------------------------------------------------------------------
-- spoton_menu_snapshots: immutable raw provider menu snapshots
-- ---------------------------------------------------------------------------

create table if not exists spoton_menu_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references restaurants(id),
  location_id   uuid        not null references locations(id),
  menu_version  text        not null,
  raw_menu      jsonb       not null,
  retrieved_at  timestamptz not null,
  created_at    timestamptz not null default now()
);

comment on table spoton_menu_snapshots is 
  'Immutable, append-only storage of raw provider menu responses. No updated_at or update trigger - snapshots are never modified after creation.';

comment on column spoton_menu_snapshots.menu_version is 
  'Opaque provider version string from ProviderMenu.menuVersion, used for change detection and reconciliation.';

comment on column spoton_menu_snapshots.raw_menu is 
  'Complete ProviderMenu JSON from the provider, stored for diagnosis and audit. Never modified after creation.';

comment on column spoton_menu_snapshots.retrieved_at is 
  'When the provider reported this snapshot (from ProviderMenu.retrievedAt), distinct from created_at (when we stored it).';

-- Indexes for performance
create index if not exists idx_spoton_menu_snapshots_location_retrieved 
  on spoton_menu_snapshots (location_id, retrieved_at desc);

create index if not exists idx_spoton_menu_snapshots_restaurant 
  on spoton_menu_snapshots (restaurant_id);

create index if not exists idx_spoton_menu_snapshots_version 
  on spoton_menu_snapshots (location_id, menu_version);

-- RLS: standard tenant isolation with location scope
alter table spoton_menu_snapshots enable row level security;
select app.enable_tenant_rls('spoton_menu_snapshots', true);

-- ---------------------------------------------------------------------------
-- menu_mappings: stable AETHER ↔ SpotOn ID mappings
-- ---------------------------------------------------------------------------

create table if not exists menu_mappings (
  id                    uuid                  primary key default gen_random_uuid(),
  restaurant_id         uuid                  not null references restaurants(id),
  location_id           uuid                  not null references locations(id),
  entity_type           menu_entity_type      not null,
  aether_id             uuid                  not null,
  provider_id           text                  not null,
  provider_name         text                  not null,
  mapping_status        menu_mapping_status   not null default 'active',
  last_seen_snapshot_id uuid                  references spoton_menu_snapshots(id),
  created_at            timestamptz           not null default now(),
  updated_at            timestamptz           not null default now(),
  broken_at             timestamptz
);

comment on table menu_mappings is 
  'Stable AETHER ↔ SpotOn ID mappings that survive provider changes. ADR 0006: broken mappings are flagged, never auto-remapped.';

comment on column menu_mappings.aether_id is 
  'Our permanent, stable identifier for this entity. Decoupled from provider IDs so mappings survive provider changes.';

comment on column menu_mappings.provider_id is 
  'SpotOn identifier for this entity (categoryId, itemId, or modifierId from ProviderMenu).';

comment on column menu_mappings.provider_name is 
  'Provider-reported name for display and debugging. May change over time; aether_id remains stable.';

comment on column menu_mappings.mapping_status is 
  'Lifecycle: active (current), broken (provider ID disappeared), archived (intentionally retired).';

comment on column menu_mappings.last_seen_snapshot_id is 
  'Most recent snapshot where this provider_id was observed. Used to detect when mappings break.';

comment on column menu_mappings.broken_at is 
  'When this mapping was detected as broken (provider ID no longer in snapshots). NULL for active/archived mappings.';

-- Indexes for performance
create index if not exists idx_menu_mappings_location_type_status 
  on menu_mappings (location_id, entity_type, mapping_status);

create index if not exists idx_menu_mappings_provider_lookup 
  on menu_mappings (provider_id, entity_type);

create index if not exists idx_menu_mappings_aether_id 
  on menu_mappings (aether_id);

create index if not exists idx_menu_mappings_restaurant 
  on menu_mappings (restaurant_id);

-- Unique constraint: only one active mapping per (location, entity_type, provider_id)
-- Partial index allows multiple broken/archived mappings for historical tracking
create unique index if not exists idx_menu_mappings_active_unique 
  on menu_mappings (location_id, entity_type, provider_id) 
  where mapping_status = 'active';

-- Trigger for updated_at
create trigger trg_menu_mappings_updated_at
  before update on menu_mappings
  for each row execute function app.set_updated_at();

-- RLS: standard tenant isolation with location scope
alter table menu_mappings enable row level security;
select app.enable_tenant_rls('menu_mappings', true);

-- ---------------------------------------------------------------------------
-- sync_cursors: per-location menu version tracking and freshness monitoring
-- ---------------------------------------------------------------------------

create table if not exists sync_cursors (
  location_id       uuid                primary key references locations(id),
  restaurant_id     uuid                not null references restaurants(id),
  last_menu_version text,
  last_synced_at    timestamptz,
  sync_status       menu_sync_status    not null default 'stale',
  last_error        text,
  created_at        timestamptz         not null default now(),
  updated_at        timestamptz         not null default now()
);

comment on table sync_cursors is 
  'One cursor per location tracking menu version and sync freshness. Used for change detection and operational monitoring.';

comment on column sync_cursors.last_menu_version is 
  'Most recent menu_version from spoton_menu_snapshots. Used to detect when provider menu changes.';

comment on column sync_cursors.sync_status is 
  'Freshness indicator: fresh (recently synced), stale (sync overdue), error (last sync failed).';

comment on column sync_cursors.last_error is 
  'Diagnostic information from most recent failed sync attempt. NULL when sync_status is fresh or stale.';

-- Index for restaurant-wide queries
create index if not exists idx_sync_cursors_restaurant 
  on sync_cursors (restaurant_id);

-- Index for monitoring stale/error states
create index if not exists idx_sync_cursors_status 
  on sync_cursors (sync_status);

-- Trigger for updated_at
create trigger trg_sync_cursors_updated_at
  before update on sync_cursors
  for each row execute function app.set_updated_at();

-- RLS: standard tenant isolation with location scope
alter table sync_cursors enable row level security;
select app.enable_tenant_rls('sync_cursors', true);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant usage on schema app to authenticated, anon;
grant select, insert, update, delete
  on spoton_menu_snapshots, menu_mappings, sync_cursors
  to authenticated, anon;

-- Grant usage on enum types
grant usage on type menu_entity_type to authenticated, anon;
grant usage on type menu_mapping_status to authenticated, anon;
grant usage on type menu_sync_status to authenticated, anon;

-- Made with Bob

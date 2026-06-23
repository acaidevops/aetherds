# D3: Menu Import and Normalization - Database Schema Migration Plan

**Status**: Ready for Review  
**Date**: 2026-06-22  
**Migration File**: `supabase/migrations/00000000000005_menu_sync.sql`

## Overview

This document specifies the complete database schema for menu import and normalization (D3), implementing the requirements from ADR-0006 (Menu Ownership) and building on the RLS infrastructure established in A3.

## Design Principles

1. **Immutable snapshots**: Raw provider data preserved for diagnosis and audit
2. **Stable mappings**: AETHER ↔ SpotOn ID mappings that survive provider changes
3. **Never guess**: Broken mappings flagged explicitly, never auto-remapped
4. **Unpublished by default**: New items remain unpublished until enriched
5. **Tenant isolation**: Full RLS on all tables using established patterns

## Schema Design

### Enum Types

```sql
-- Entity types for menu mappings
create type menu_entity_type as enum ('category', 'item', 'modifier');

-- Mapping status lifecycle
create type menu_mapping_status as enum ('active', 'broken', 'archived');

-- Sync freshness indicator
create type menu_sync_status as enum ('fresh', 'stale', 'error');
```

**Design rationale**:
- `menu_entity_type`: Distinguishes between the three mappable entities in the menu hierarchy
- `menu_mapping_status`: 
  - `active`: Current, valid mapping
  - `broken`: Provider ID no longer found in snapshots (ADR-0006: "broken mappings unpublish affected paths")
  - `archived`: Intentionally retired mapping (e.g., item permanently removed)
- `menu_sync_status`:
  - `fresh`: Recently synced, data is current
  - `stale`: Sync overdue or version mismatch detected
  - `error`: Last sync attempt failed

### Table 1: spoton_menu_snapshots

**Purpose**: Immutable, append-only storage of raw provider menu responses for diagnosis and reconciliation.

```sql
create table if not exists spoton_menu_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  restaurant_id uuid        not null references restaurants(id),
  location_id   uuid        not null references locations(id),
  menu_version  text        not null,
  raw_menu      jsonb       not null,
  retrieved_at  timestamptz not null,
  created_at    timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_spoton_menu_snapshots_location_retrieved 
  on spoton_menu_snapshots (location_id, retrieved_at desc);

create index if not exists idx_spoton_menu_snapshots_restaurant 
  on spoton_menu_snapshots (restaurant_id);

create index if not exists idx_spoton_menu_snapshots_version 
  on spoton_menu_snapshots (location_id, menu_version);
```

**Design decisions**:

1. **Immutability**: No `updated_at` column, no update trigger. Snapshots are append-only.
2. **Tenant isolation**: Both `restaurant_id` and `location_id` required (menus are location-specific per ADR-0002)
3. **Version tracking**: `menu_version` from provider enables reconciliation and change detection
4. **Raw storage**: `raw_menu` stores the complete `ProviderMenu` JSON for diagnosis
5. **Timestamp separation**: `retrieved_at` (from provider) vs `created_at` (when we stored it)
6. **Index strategy**:
   - `(location_id, retrieved_at desc)`: Fast lookup of latest snapshot per location
   - `(restaurant_id)`: Support restaurant-wide queries
   - `(location_id, menu_version)`: Detect version changes efficiently

**RLS Policy**:
```sql
select app.enable_tenant_rls('spoton_menu_snapshots', true);
```

Uses the standard tenant isolation helper with location scope.

### Table 2: menu_mappings

**Purpose**: Stable AETHER ↔ SpotOn ID mappings that survive provider changes and track mapping lifecycle.

```sql
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
create unique index if not exists idx_menu_mappings_active_unique 
  on menu_mappings (location_id, entity_type, provider_id) 
  where mapping_status = 'active';

-- Trigger for updated_at
create trigger trg_menu_mappings_updated_at
  before update on menu_mappings
  for each row execute function app.set_updated_at();
```

**Design decisions**:

1. **Stable AETHER IDs**: `aether_id` is our permanent identifier, decoupled from provider IDs
2. **Provider tracking**: Both `provider_id` (for lookups) and `provider_name` (for display/debugging)
3. **Status lifecycle**: 
   - New mappings start as `active`
   - Become `broken` when provider ID disappears (ADR-0006: "never guess")
   - Can be `archived` when intentionally retired
4. **Snapshot reference**: `last_seen_snapshot_id` tracks when we last saw this provider ID
5. **Broken tracking**: `broken_at` timestamp records when mapping broke (for diagnosis)
6. **Partial unique index**: Only `active` mappings must be unique per (location, entity_type, provider_id)
   - Allows multiple `broken`/`archived` mappings for historical tracking
   - Prevents duplicate active mappings
7. **Index strategy**:
   - `(location_id, entity_type, mapping_status)`: Fast queries for active mappings by type
   - `(provider_id, entity_type)`: Reverse lookup from provider to AETHER
   - `(aether_id)`: Forward lookup from AETHER to provider
   - `(restaurant_id)`: Support restaurant-wide queries

**RLS Policy**:
```sql
select app.enable_tenant_rls('menu_mappings', true);
```

Uses the standard tenant isolation helper with location scope.

### Table 3: sync_cursors

**Purpose**: Track menu version and sync freshness per location (one cursor per location).

```sql
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
```

**Design decisions**:

1. **Location as PK**: One cursor per location (natural key)
2. **Version tracking**: `last_menu_version` enables change detection
3. **Freshness monitoring**: `sync_status` and `last_synced_at` support operational monitoring
4. **Error tracking**: `last_error` stores diagnostic information for failed syncs
5. **Default state**: New cursors start as `stale` (must sync before becoming `fresh`)
6. **Index strategy**:
   - `(restaurant_id)`: Support restaurant-wide sync monitoring
   - `(sync_status)`: Fast queries for stale/error locations needing attention

**RLS Policy**:
```sql
select app.enable_tenant_rls('sync_cursors', true);
```

Uses the standard tenant isolation helper with location scope.

## Complete Migration SQL

```sql
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
```

## Example Queries

### 1. Get Latest Menu Snapshot for a Location

```sql
-- Retrieve the most recent menu snapshot for a location
select 
  id,
  menu_version,
  raw_menu,
  retrieved_at,
  created_at
from spoton_menu_snapshots
where location_id = :location_id
order by retrieved_at desc
limit 1;
```

### 2. Find Active Mappings for Menu Items

```sql
-- Get all active item mappings with their provider details
select 
  aether_id,
  provider_id,
  provider_name,
  last_seen_snapshot_id,
  updated_at
from menu_mappings
where location_id = :location_id
  and entity_type = 'item'
  and mapping_status = 'active'
order by provider_name;
```

### 3. Detect Broken Mappings

```sql
-- Find mappings that were broken in the last sync
select 
  m.aether_id,
  m.provider_id,
  m.provider_name,
  m.entity_type,
  m.broken_at,
  s.menu_version as last_seen_version
from menu_mappings m
left join spoton_menu_snapshots s on s.id = m.last_seen_snapshot_id
where m.location_id = :location_id
  and m.mapping_status = 'broken'
order by m.broken_at desc;
```

### 4. Check Sync Status for All Locations in a Restaurant

```sql
-- Monitor sync health across all locations
select 
  l.name as location_name,
  sc.last_menu_version,
  sc.last_synced_at,
  sc.sync_status,
  sc.last_error,
  extract(epoch from (now() - sc.last_synced_at))/3600 as hours_since_sync
from sync_cursors sc
join locations l on l.id = sc.location_id
where sc.restaurant_id = :restaurant_id
order by sc.last_synced_at desc nulls last;
```

### 5. Reconcile Provider Menu with Existing Mappings

```sql
-- Find provider items that don't have active mappings (new items)
with provider_items as (
  select 
    jsonb_array_elements(raw_menu->'items')->>'itemId' as provider_id,
    jsonb_array_elements(raw_menu->'items')->>'name' as provider_name
  from spoton_menu_snapshots
  where location_id = :location_id
  order by retrieved_at desc
  limit 1
)
select 
  pi.provider_id,
  pi.provider_name,
  m.aether_id,
  m.mapping_status
from provider_items pi
left join menu_mappings m on 
  m.provider_id = pi.provider_id 
  and m.entity_type = 'item'
  and m.location_id = :location_id
where m.aether_id is null 
   or m.mapping_status != 'active';
```

### 6. Update Mapping Status to Broken

```sql
-- Mark a mapping as broken when provider ID disappears
update menu_mappings
set 
  mapping_status = 'broken',
  broken_at = now()
where location_id = :location_id
  and entity_type = :entity_type
  and provider_id = :provider_id
  and mapping_status = 'active';
```

### 7. Create New Snapshot and Update Cursor

```sql
-- Transaction: store new snapshot and update sync cursor
begin;

-- Insert new snapshot
insert into spoton_menu_snapshots (
  restaurant_id,
  location_id,
  menu_version,
  raw_menu,
  retrieved_at
) values (
  :restaurant_id,
  :location_id,
  :menu_version,
  :raw_menu,
  :retrieved_at
)
returning id;

-- Update sync cursor
insert into sync_cursors (
  location_id,
  restaurant_id,
  last_menu_version,
  last_synced_at,
  sync_status
) values (
  :location_id,
  :restaurant_id,
  :menu_version,
  now(),
  'fresh'
)
on conflict (location_id) do update set
  last_menu_version = excluded.last_menu_version,
  last_synced_at = excluded.last_synced_at,
  sync_status = excluded.sync_status,
  last_error = null;

commit;
```

## Migration Verification Checklist

- [ ] All enum types created before table definitions
- [ ] All tables have proper foreign key constraints
- [ ] All tables have appropriate indexes for query patterns
- [ ] RLS enabled on all tables using `app.enable_tenant_rls`
- [ ] Privileges granted to `authenticated` and `anon` roles
- [ ] Comments added to tables and critical columns
- [ ] Immutability enforced (no `updated_at` on snapshots)
- [ ] Unique constraints prevent duplicate active mappings
- [ ] Partial indexes used where appropriate (active mappings)
- [ ] All timestamps use `timestamptz` (UTC)

## Integration Points

### With Existing Schema

- **restaurants**: Referenced by all three tables for tenant isolation
- **locations**: Referenced by all three tables for location scope
- **app.enable_tenant_rls()**: Reuses established RLS helper from A3
- **app.set_updated_at()**: Reuses established trigger function from A3

### With Domain Model

- **ProviderMenu** ([`src/modules/spoton/domain/menu.ts`](src/modules/spoton/domain/menu.ts:44-51)): 
  - `menuVersion` → `spoton_menu_snapshots.menu_version`
  - `retrievedAt` → `spoton_menu_snapshots.retrieved_at`
  - Complete JSON → `spoton_menu_snapshots.raw_menu`

- **ProviderMenuItem** ([`src/modules/spoton/domain/menu.ts`](src/modules/spoton/domain/menu.ts:31-37)):
  - `itemId` → `menu_mappings.provider_id` (where `entity_type = 'item'`)
  - `name` → `menu_mappings.provider_name`

- **ProviderMenuCategory** ([`src/modules/spoton/domain/menu.ts`](src/modules/spoton/domain/menu.ts:39-42)):
  - `categoryId` → `menu_mappings.provider_id` (where `entity_type = 'category'`)

- **ProviderModifier** ([`src/modules/spoton/domain/menu.ts`](src/modules/spoton/domain/menu.ts:15-20)):
  - `modifierId` → `menu_mappings.provider_id` (where `entity_type = 'modifier'`)

## Security Considerations

1. **RLS Enforcement**: All tables use standard tenant isolation with location scope
2. **Immutability**: Snapshots cannot be modified after creation (no update trigger)
3. **Audit Trail**: Snapshots provide complete history of provider data
4. **Broken Mapping Detection**: Explicit status prevents silent failures
5. **Service Role Access**: Application server bypasses RLS but respects business rules

## Performance Considerations

1. **Snapshot Queries**: Index on `(location_id, retrieved_at desc)` optimizes latest lookup
2. **Mapping Lookups**: Indexes support both forward (AETHER→provider) and reverse (provider→AETHER) lookups
3. **Active Mappings**: Partial unique index only on active mappings reduces index size
4. **Sync Monitoring**: Status index enables fast queries for stale/error locations
5. **JSONB Storage**: `raw_menu` uses JSONB for efficient querying if needed later

## Future Considerations

1. **Snapshot Retention**: Consider adding a cleanup job to archive old snapshots (keep last N per location)
2. **Mapping History**: Current design preserves broken/archived mappings; may need archival strategy
3. **Version Comparison**: Could add indexes on `raw_menu` JSONB fields if deep querying needed
4. **Sync Scheduling**: `sync_cursors` ready for scheduled sync jobs (ADR-0011)
5. **Enrichment Integration**: Mappings ready to link with future enrichment tables

## References

- [ADR-0006: Menu Ownership](docs/adr/0006-menu-ownership.md)
- [ADR-0010: Tenant Isolation](docs/adr/0010-tenant-isolation.md)
- [ADR-0012: RLS Mechanism](docs/adr/0012-rls-mechanism.md)
- [Domain Model: Menu](src/modules/spoton/domain/menu.ts)
- [Existing Migration: A3 Audit Events](supabase/migrations/00000000000003_audit_events.sql)
- [Existing Migration: Tenancy Root](supabase/migrations/00000000000001_tenancy_root.sql)
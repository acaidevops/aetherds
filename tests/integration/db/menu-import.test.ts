/**
 * Integration tests for menu import with real database.
 *
 * Tests the full import flow with actual database operations:
 * - End-to-end menu import with mock provider
 * - Snapshot persistence
 * - Mapping creation and updates
 * - Sync cursor management
 * - RLS policy enforcement
 * - Broken mapping detection
 * - Audit event recording
 * - Idempotent imports
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

import { importMenu } from '@/modules/menu/application/import-menu';
import { SupabaseMenuSnapshotRepository } from '@/modules/menu/infrastructure/supabase-menu-snapshot-repository';
import { SupabaseMenuMappingRepository } from '@/modules/menu/infrastructure/supabase-menu-mapping-repository';
import { SupabaseSyncCursorRepository } from '@/modules/menu/infrastructure/supabase-sync-cursor-repository';
import { createMockPosProvider } from '@/modules/spoton/infrastructure/mock-pos-provider';
import { buildMockMenu, MOCK_MENU_VERSION } from '@/modules/spoton/infrastructure/mock-menu-seed';
import type { Principal } from '@/shared/auth/principal';
import { createClient } from '@supabase/supabase-js';

import { createPool, dbReachable, asTenant, asService, committed, type TenantClaims } from './helpers';

// Skip all tests if database is not reachable
const testIf = dbReachable ? it : it.skip;

describe('Menu Import Integration', () => {
  let pool: Pool;
  let restaurantId: string;
  let locationId: string;
  let supabaseClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    if (!dbReachable) return;

    pool = createPool();

    // Create test restaurant and location
    await committed(pool, async (client) => {
      // Create restaurant
      const restaurantResult = await client.query(
        `INSERT INTO restaurants (id, name, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Test Restaurant', now(), now())
         RETURNING id`
      );
      restaurantId = restaurantResult.rows[0].id;

      // Create location
      const locationResult = await client.query(
        `INSERT INTO locations (id, restaurant_id, name, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'Test Location', now(), now())
         RETURNING id`,
        [restaurantId]
      );
      locationId = locationResult.rows[0].id;
    });

    // Create Supabase client for repositories
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  });

  afterAll(async () => {
    if (!dbReachable) return;

    // Clean up test data
    await committed(pool, async (client) => {
      if (locationId) {
        await client.query('DELETE FROM locations WHERE id = $1', [locationId]);
      }
      if (restaurantId) {
        await client.query('DELETE FROM restaurants WHERE id = $1', [restaurantId]);
      }
    });

    await pool.end();
  });

  beforeEach(async () => {
    if (!dbReachable) return;

    // Clean up menu data before each test
    await asService(pool, async (client) => {
      await client.query('DELETE FROM menu_mappings WHERE location_id = $1', [locationId]);
      await client.query('DELETE FROM spoton_menu_snapshots WHERE location_id = $1', [locationId]);
      await client.query('DELETE FROM sync_cursors WHERE location_id = $1', [locationId]);
      await client.query('DELETE FROM audit_events WHERE location_id = $1', [locationId]);
    });
  });

  testIf('performs end-to-end menu import with mock provider', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    const result = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify result structure
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot.id).toBeTruthy();
    expect(result.snapshot.menuVersion).toBe(MOCK_MENU_VERSION);
    expect(result.newMappings.length).toBeGreaterThan(0);
    expect(result.stats.categoriesProcessed).toBe(2);
    expect(result.stats.itemsProcessed).toBe(4);
    expect(result.stats.modifiersProcessed).toBeGreaterThan(0);
  });

  testIf('saves snapshot correctly in database', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    const result = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify snapshot in database
    await asService(pool, async (client) => {
      const snapshotResult = await client.query(
        'SELECT * FROM spoton_menu_snapshots WHERE id = $1',
        [result.snapshot.id]
      );

      expect(snapshotResult.rows).toHaveLength(1);
      const snapshot = snapshotResult.rows[0];
      expect(snapshot.restaurant_id).toBe(restaurantId);
      expect(snapshot.location_id).toBe(locationId);
      expect(snapshot.menu_version).toBe(MOCK_MENU_VERSION);
      expect(snapshot.raw_menu).toBeDefined();
      expect(snapshot.raw_menu.categories).toBeDefined();
      expect(snapshot.raw_menu.items).toBeDefined();
    });
  });

  testIf('creates mappings with correct structure', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    const result = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify mappings in database
    await asService(pool, async (client) => {
      const mappingsResult = await client.query(
        'SELECT * FROM menu_mappings WHERE location_id = $1 ORDER BY entity_type, provider_id',
        [locationId]
      );

      expect(mappingsResult.rows.length).toBeGreaterThan(0);

      // Check category mapping
      const categoryMapping = mappingsResult.rows.find(r => r.entity_type === 'category');
      expect(categoryMapping).toBeDefined();
      expect(categoryMapping.aether_id).toMatch(/^aether_/);
      expect(categoryMapping.provider_id).toBeTruthy();
      expect(categoryMapping.provider_name).toBeTruthy();
      expect(categoryMapping.mapping_status).toBe('active');
      expect(categoryMapping.last_seen_snapshot_id).toBe(result.snapshot.id);

      // Check item mapping
      const itemMapping = mappingsResult.rows.find(r => r.entity_type === 'item');
      expect(itemMapping).toBeDefined();
      expect(itemMapping.aether_id).toMatch(/^aether_/);

      // Check modifier mapping
      const modifierMapping = mappingsResult.rows.find(r => r.entity_type === 'modifier');
      expect(modifierMapping).toBeDefined();
      expect(modifierMapping.aether_id).toMatch(/^aether_/);
    });
  });

  testIf('updates sync cursor correctly', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify sync cursor in database
    await asService(pool, async (client) => {
      const cursorResult = await client.query(
        'SELECT * FROM sync_cursors WHERE location_id = $1',
        [locationId]
      );

      expect(cursorResult.rows).toHaveLength(1);
      const cursor = cursorResult.rows[0];
      expect(cursor.restaurant_id).toBe(restaurantId);
      expect(cursor.last_menu_version).toBe(MOCK_MENU_VERSION);
      expect(cursor.sync_status).toBe('fresh');
      expect(cursor.last_error).toBeNull();
      expect(cursor.last_synced_at).toBeTruthy();
    });
  });

  testIf('enforces RLS policies for tenant isolation', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    // Import menu
    await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Try to access with correct tenant claims
    const correctClaims: TenantClaims = {
      restaurantId,
      locationId,
      appRole: 'manager',
    };

    await asTenant(pool, correctClaims, async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM menu_mappings WHERE location_id = $1',
        [locationId]
      );
      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    });

    // Try to access with wrong tenant claims (should see nothing)
    const wrongClaims: TenantClaims = {
      restaurantId: 'wrong-restaurant-id',
      locationId: 'wrong-location-id',
      appRole: 'manager',
    };

    await asTenant(pool, wrongClaims, async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM menu_mappings WHERE location_id = $1',
        [locationId]
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  testIf('detects broken mappings on re-import with changed menu', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    // First import
    const firstResult = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    expect(firstResult.brokenMappings).toHaveLength(0);

    // Create a modified menu without one of the items
    const originalMenu = buildMockMenu(new Date().toISOString());
    const modifiedMenu = {
      ...originalMenu,
      menuVersion: 'v2',
      items: originalMenu.items.filter(item => item.itemId !== 'item_calamari'),
    };

    // Create a new provider with the modified menu
    const modifiedProvider = createMockPosProvider();
    modifiedProvider.getMenu = async () => ({ ok: true, value: modifiedMenu });

    // Second import with modified menu
    const secondResult = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: modifiedProvider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify broken mappings were detected
    expect(secondResult.brokenMappings.length).toBeGreaterThan(0);
    expect(secondResult.stats.brokenEntities).toBeGreaterThan(0);

    // Verify broken mappings in database
    await asService(pool, async (client) => {
      const brokenResult = await client.query(
        'SELECT * FROM menu_mappings WHERE location_id = $1 AND mapping_status = $2',
        [locationId, 'broken']
      );

      expect(brokenResult.rows.length).toBeGreaterThan(0);
      const brokenMapping = brokenResult.rows[0];
      expect(brokenMapping.broken_at).toBeTruthy();
    });
  });

  testIf('records audit events', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Verify audit event was recorded
    await asService(pool, async (client) => {
      const auditResult = await client.query(
        'SELECT * FROM audit_events WHERE location_id = $1 AND action = $2',
        [locationId, 'menu_import']
      );

      expect(auditResult.rows.length).toBeGreaterThan(0);
      const auditEvent = auditResult.rows[0];
      expect(auditEvent.outcome).toBe('success');
      expect(auditEvent.after).toBeDefined();
      expect(auditEvent.after.menuVersion).toBe(MOCK_MENU_VERSION);
    });
  });

  testIf('performs idempotent imports (running twice produces same result)', async () => {
    const provider = createMockPosProvider();
    const snapshotRepo = new SupabaseMenuSnapshotRepository(supabaseClient);
    const mappingRepo = new SupabaseMenuMappingRepository(supabaseClient);
    const cursorRepo = new SupabaseSyncCursorRepository(supabaseClient);

    const principal: Principal = {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: { restaurantId, locationId },
    };

    // First import
    await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Get mapping count after first import
    const firstMappingCount = await asService(pool, async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM menu_mappings WHERE location_id = $1',
        [locationId]
      );
      return parseInt(result.rows[0].count);
    });

    // Second import with same menu
    const secondResult = await importMenu(
      {
        restaurantId,
        locationId,
        posProvider: provider,
        principal,
      },
      {
        snapshotRepo,
        mappingRepo,
        cursorRepo,
      }
    );

    // Get mapping count after second import
    const secondMappingCount = await asService(pool, async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM menu_mappings WHERE location_id = $1',
        [locationId]
      );
      return parseInt(result.rows[0].count);
    });

    // Verify no new mappings were created
    expect(secondMappingCount).toBe(firstMappingCount);
    expect(secondResult.newMappings).toHaveLength(0);
    expect(secondResult.stats.unchangedEntities).toBeGreaterThan(0);

    // Verify snapshots were created for both imports
    const snapshotCount = await asService(pool, async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM spoton_menu_snapshots WHERE location_id = $1',
        [locationId]
      );
      return parseInt(result.rows[0].count);
    });

    expect(snapshotCount).toBe(2); // Two snapshots, one per import
  });
});

// Made with Bob

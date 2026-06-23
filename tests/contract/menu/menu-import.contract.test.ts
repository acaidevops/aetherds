/**
 * Contract tests for menu import service with PosProvider.
 *
 * Verifies that the import service correctly works with the PosProvider contract:
 * - Import works with MockPosProvider
 * - Handles all menu structures from provider
 * - Validates provider response format
 * - Handles provider errors correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { importMenu } from '@/modules/menu/application/import-menu';
import type { MenuSnapshotRepository, MenuMappingRepository, SyncCursorRepository } from '@/modules/menu/application/ports';
import type { MenuSnapshot } from '@/modules/menu/domain/menu-snapshot';
import type { MenuMapping } from '@/modules/menu/domain/menu-mapping';
import type { SyncCursor } from '@/modules/menu/domain/sync-cursor';
import { createMockPosProvider } from '@/modules/spoton/infrastructure/mock-pos-provider';
import { buildMockMenu, MOCK_MENU_VERSION } from '@/modules/spoton/infrastructure/mock-menu-seed';
import type { PosProvider } from '@/modules/spoton/contracts/pos-provider';
import type { Principal } from '@/shared/auth/principal';
import { err } from '@/modules/spoton/domain/result';

// Mock the audit module
vi.mock('@/modules/audit', () => ({
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Create mock repositories for contract tests.
 */
function createMockRepos() {
  const snapshots: MenuSnapshot[] = [];
  const mappings: MenuMapping[] = [];
  const cursors: Map<string, SyncCursor> = new Map();

  const snapshotRepo: MenuSnapshotRepository = {
    save: vi.fn().mockImplementation(async (input) => {
      const snapshot: MenuSnapshot = {
        id: `snapshot_${Date.now()}`,
        ...input,
        createdAt: new Date(),
      };
      snapshots.push(snapshot);
      return snapshot;
    }),
    findLatestByLocation: vi.fn().mockImplementation(async (locationId) => {
      const filtered = snapshots.filter(s => s.locationId === locationId);
      return filtered.length > 0 ? filtered[filtered.length - 1] : null;
    }),
    findByVersion: vi.fn(),
    findByLocation: vi.fn(),
  };

  const mappingRepo: MenuMappingRepository = {
    save: vi.fn().mockImplementation(async (input) => {
      const mapping: MenuMapping = {
        id: `mapping_${Date.now()}_${Math.random()}`,
        ...input,
        mappingStatus: 'active',
        lastSeenSnapshotId: input.lastSeenSnapshotId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      mappings.push(mapping);
      return mapping;
    }),
    update: vi.fn().mockImplementation(async (id, input) => {
      const mapping = mappings.find(m => m.id === id);
      if (!mapping) throw new Error('Mapping not found');
      const updated = { ...mapping, ...input, updatedAt: new Date() };
      const index = mappings.indexOf(mapping);
      mappings[index] = updated;
      return updated;
    }),
    findActiveByLocation: vi.fn().mockImplementation(async (locationId) => {
      return mappings.filter(m => m.locationId === locationId && m.mappingStatus === 'active');
    }),
    findByProviderId: vi.fn(),
    findByAetherId: vi.fn(),
    markBroken: vi.fn().mockImplementation(async (id) => {
      const mapping = mappings.find(m => m.id === id);
      if (!mapping) throw new Error('Mapping not found');
      const broken = { ...mapping, mappingStatus: 'broken' as const, brokenAt: new Date() };
      const index = mappings.indexOf(mapping);
      mappings[index] = broken;
      return broken;
    }),
    archive: vi.fn(),
    findBrokenByLocation: vi.fn(),
  };

  const cursorRepo: SyncCursorRepository = {
    upsert: vi.fn().mockImplementation(async (input) => {
      const cursor: SyncCursor = {
        ...input,
        lastMenuVersion: input.lastMenuVersion ?? null,
        lastSyncedAt: input.lastSyncedAt ?? null,
        lastError: input.lastError ?? null,
        createdAt: cursors.get(input.locationId)?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };
      cursors.set(input.locationId, cursor);
      return cursor;
    }),
    findByLocation: vi.fn().mockImplementation(async (locationId) => {
      return cursors.get(locationId) ?? null;
    }),
    findByRestaurant: vi.fn(),
    findByStatus: vi.fn(),
  };

  return { snapshotRepo, mappingRepo, cursorRepo, snapshots, mappings, cursors };
}

/**
 * Create test principal.
 */
function createTestPrincipal(): Principal {
  return {
    context: { kind: 'service' },
    role: 'platform_operator',
    scope: {
      restaurantId: 'test-restaurant',
      locationId: 'test-location',
    },
  };
}

describe('Menu Import Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MockPosProvider integration', () => {
    it('successfully imports menu from MockPosProvider', async () => {
      const provider = createMockPosProvider();
      const getMenuSpy = vi.spyOn(provider, 'getMenu');
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      // Verify provider was called correctly
      expect(getMenuSpy).toHaveBeenCalledWith({
        location: { locationId: 'test-location' },
      });

      // Verify result structure
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.menuVersion).toBe(MOCK_MENU_VERSION);
      expect(result.newMappings.length).toBeGreaterThan(0);
      expect(result.stats.categoriesProcessed).toBeGreaterThan(0);
      expect(result.stats.itemsProcessed).toBeGreaterThan(0);
    });

    it('handles all menu structures from MockPosProvider', async () => {
      const provider = createMockPosProvider();
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      // Verify all entity types are processed
      const { mappings } = repos;
      const categories = mappings.filter(m => m.entityType === 'category');
      const items = mappings.filter(m => m.entityType === 'item');
      const modifiers = mappings.filter(m => m.entityType === 'modifier');

      expect(categories.length).toBeGreaterThan(0);
      expect(items.length).toBeGreaterThan(0);
      expect(modifiers.length).toBeGreaterThan(0);

      // Verify menu structure is preserved
      const menu = result.snapshot.rawMenu;
      expect(menu.categories).toBeDefined();
      expect(menu.items).toBeDefined();
      expect(menu.menuVersion).toBe(MOCK_MENU_VERSION);
      expect(menu.retrievedAt).toBeDefined();

      // Verify items have proper structure
      for (const item of menu.items) {
        expect(item.itemId).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.categoryId).toBeTruthy();
        expect(item.basePrice).toBeDefined();
        expect(typeof item.available).toBe('boolean');
        expect(Array.isArray(item.modifierGroups)).toBe(true);
      }

      // Verify categories have proper structure
      for (const category of menu.categories) {
        expect(category.categoryId).toBeTruthy();
        expect(category.name).toBeTruthy();
      }
    });

    it('validates provider response format', async () => {
      const provider = createMockPosProvider();
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      const menu = result.snapshot.rawMenu;

      // Validate required fields exist
      expect(menu.menuVersion).toBeTruthy();
      expect(menu.retrievedAt).toBeTruthy();
      expect(Array.isArray(menu.categories)).toBe(true);
      expect(Array.isArray(menu.items)).toBe(true);

      // Validate date format
      expect(() => new Date(menu.retrievedAt)).not.toThrow();

      // Validate price format (Money JSON structure)
      for (const item of menu.items) {
        expect(item.basePrice).toBeDefined();
        expect(item.basePrice).toHaveProperty('currency');
        expect(item.basePrice.currency).toBe('USD');
      }
    });

    it('handles modifier groups correctly', async () => {
      const provider = createMockPosProvider();
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      const menu = result.snapshot.rawMenu;
      
      // Find an item with modifiers
      const itemWithModifiers = menu.items.find(item => item.modifierGroups.length > 0);
      expect(itemWithModifiers).toBeDefined();

      if (itemWithModifiers && itemWithModifiers.modifierGroups.length > 0) {
        const group = itemWithModifiers.modifierGroups[0];
        expect(group).toBeDefined();
        
        if (group) {
          // Validate modifier group structure
          expect(group.groupId).toBeTruthy();
          expect(group.name).toBeTruthy();
          expect(typeof group.minSelections).toBe('number');
          expect(typeof group.maxSelections).toBe('number');
          expect(Array.isArray(group.modifiers)).toBe(true);

          // Validate modifier structure
          for (const modifier of group.modifiers) {
          expect(modifier.modifierId).toBeTruthy();
          expect(modifier.name).toBeTruthy();
          expect(modifier.priceDelta).toBeDefined();
          expect(typeof modifier.available).toBe('boolean');
          }
        }
      }
    });
  });

  describe('Provider error handling', () => {
    it('handles provider unavailable error', async () => {
      const provider = createMockPosProvider();
      provider.setOffline(true);

      const repos = createMockRepos();
      const principal = createTestPrincipal();

      await expect(
        importMenu(
          {
            restaurantId: 'test-restaurant',
            locationId: 'test-location',
            posProvider: provider,
            principal,
          },
          repos
        )
      ).rejects.toThrow(/Failed to fetch menu from provider/);

      // Verify sync cursor was updated to error state
      const cursor = repos.cursors.get('test-location');
      expect(cursor).toBeDefined();
      expect(cursor?.syncStatus).toBe('error');
      expect(cursor?.lastError).toContain('offline');
    });

    it('handles provider error responses correctly', async () => {
      const provider: PosProvider = {
        providerId: 'test',
        getMenu: vi.fn().mockResolvedValue(
          err({
            kind: 'invalid',
            message: 'Invalid location',
            retryable: false,
          })
        ),
        getAvailability: vi.fn(),
        getOpenCheck: vi.fn(),
        submitOrder: vi.fn(),
        getOrder: vi.fn(),
      };

      const repos = createMockRepos();
      const principal = createTestPrincipal();

      await expect(
        importMenu(
          {
            restaurantId: 'test-restaurant',
            locationId: 'test-location',
            posProvider: provider,
            principal,
          },
          repos
        )
      ).rejects.toThrow(/Invalid location/);
    });

    it('preserves error details in sync cursor', async () => {
      const provider = createMockPosProvider();
      provider.setOffline(true);

      const repos = createMockRepos();
      const principal = createTestPrincipal();

      try {
        await importMenu(
          {
            restaurantId: 'test-restaurant',
            locationId: 'test-location',
            posProvider: provider,
            principal,
          },
          repos
        );
      } catch (error) {
        // Expected to throw
      }

      const cursor = repos.cursors.get('test-location');
      expect(cursor).toBeDefined();
      expect(cursor?.syncStatus).toBe('error');
      expect(cursor?.lastError).toBeTruthy();
      expect(cursor?.lastMenuVersion).toBeNull();
      expect(cursor?.lastSyncedAt).toBeNull();
    });
  });

  describe('Provider contract compliance', () => {
    it('respects PosProvider.getMenu contract', async () => {
      const provider = createMockPosProvider();
      const getMenuSpy = vi.spyOn(provider, 'getMenu');
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      // Verify getMenu was called with correct parameters
      expect(getMenuSpy).toHaveBeenCalledTimes(1);
      expect(getMenuSpy).toHaveBeenCalledWith({
        location: { locationId: 'test-location' },
      });
    });

    it('handles provider result envelope correctly', async () => {
      const provider = createMockPosProvider();
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      // Verify the result was unwrapped from the provider envelope
      expect(result.snapshot.rawMenu).toBeDefined();
      expect(result.snapshot.rawMenu.menuVersion).toBe(MOCK_MENU_VERSION);
    });

    it('works with custom provider implementations', async () => {
      // Create a custom provider that returns a minimal menu
      const customMenu = buildMockMenu(new Date().toISOString());
      const customProvider: PosProvider = {
        providerId: 'custom',
        getMenu: vi.fn().mockResolvedValue({ ok: true, value: customMenu }),
        getAvailability: vi.fn(),
        getOpenCheck: vi.fn(),
        submitOrder: vi.fn(),
        getOrder: vi.fn(),
      };

      const repos = createMockRepos();
      const principal = createTestPrincipal();

      const result = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: customProvider,
          principal,
        },
        repos
      );

      expect(result.snapshot).toBeDefined();
      expect(customProvider.getMenu).toHaveBeenCalled();
    });
  });

  describe('Menu version tracking', () => {
    it('tracks menu version changes across imports', async () => {
      const provider = createMockPosProvider();
      const repos = createMockRepos();
      const principal = createTestPrincipal();

      // First import
      const firstResult = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: provider,
          principal,
        },
        repos
      );

      expect(firstResult.snapshot.menuVersion).toBe(MOCK_MENU_VERSION);

      // Create a new provider with a different menu version
      const newMenu = {
        ...buildMockMenu(new Date().toISOString()),
        menuVersion: 'v2',
      };
      const newProvider: PosProvider = {
        providerId: 'mock',
        getMenu: vi.fn().mockResolvedValue({ ok: true, value: newMenu }),
        getAvailability: vi.fn(),
        getOpenCheck: vi.fn(),
        submitOrder: vi.fn(),
        getOrder: vi.fn(),
      };

      // Second import
      const secondResult = await importMenu(
        {
          restaurantId: 'test-restaurant',
          locationId: 'test-location',
          posProvider: newProvider,
          principal,
        },
        repos
      );

      expect(secondResult.snapshot.menuVersion).toBe('v2');

      // Verify both snapshots exist
      expect(repos.snapshots).toHaveLength(2);
      expect(repos.snapshots[0]?.menuVersion).toBe(MOCK_MENU_VERSION);
      expect(repos.snapshots[1]?.menuVersion).toBe('v2');
    });
  });
});

// Made with Bob

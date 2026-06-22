/**
 * Unit tests for menu import service.
 *
 * Tests the importMenu() function with mocked dependencies to verify:
 * - Menu import workflow orchestration
 * - Mapping creation and updates
 * - Broken mapping detection (ADR-0006: never auto-remap)
 * - Error handling and audit trail
 * - Statistics calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

import { importMenu, type ImportMenuInput } from '@/modules/menu/application/import-menu';
import type { MenuSnapshotRepository, MenuMappingRepository, SyncCursorRepository } from '@/modules/menu/application/ports';
import type { MenuSnapshot } from '@/modules/menu/domain/menu-snapshot';
import type { MenuMapping } from '@/modules/menu/domain/menu-mapping';
import type { SyncCursor } from '@/modules/menu/domain/sync-cursor';
import type { PosProvider } from '@/modules/spoton/contracts/pos-provider';
import type { ProviderMenu } from '@/modules/spoton/domain/menu';
import { ok, err } from '@/modules/spoton/domain/result';
import type { Principal } from '@/shared/auth/principal';
import { Money } from '@/shared/money';

// Mock the audit module
vi.mock('@/modules/audit', () => ({
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const { recordAuditEvent } = await import('@/modules/audit');

const usd = (decimal: string) => Money.fromDecimal(decimal, 'USD').toJSON();

/**
 * Create a test provider menu with configurable items.
 */
function createTestMenu(options: {
  version?: string;
  categories?: Array<{ id: string; name: string }>;
  items?: Array<{ id: string; name: string; categoryId: string; modifiers?: Array<{ id: string; name: string }> }>;
} = {}): ProviderMenu {
  const categories = options.categories ?? [
    { id: 'cat_1', name: 'Category 1' },
  ];
  
  const items = options.items ?? [
    { id: 'item_1', name: 'Item 1', categoryId: 'cat_1' },
  ];

  return {
    menuVersion: options.version ?? 'v1',
    retrievedAt: new Date().toISOString(),
    categories: categories.map(c => ({ categoryId: c.id, name: c.name })),
    items: items.map(item => ({
      itemId: item.id,
      name: item.name,
      categoryId: item.categoryId,
      basePrice: usd('10.00'),
      available: true,
      modifierGroups: item.modifiers ? [{
        groupId: 'grp_1',
        name: 'Modifiers',
        minSelections: 0,
        maxSelections: 1,
        modifiers: item.modifiers.map(m => ({
          modifierId: m.id,
          name: m.name,
          priceDelta: usd('0.00'),
          available: true,
        })),
      }] : [],
    })),
  };
}

/**
 * Create mock repositories with spy functions.
 */
function createMockRepos() {
  const snapshotRepo: MenuSnapshotRepository = {
    save: vi.fn().mockImplementation(async (input) => ({
      id: `snapshot_${randomUUID()}`,
      ...input,
      createdAt: new Date(),
    } as MenuSnapshot)),
    findLatestByLocation: vi.fn().mockResolvedValue(null),
    findByVersion: vi.fn().mockResolvedValue(null),
    findByLocation: vi.fn().mockResolvedValue([]),
  };

  const mappingRepo: MenuMappingRepository = {
    save: vi.fn().mockImplementation(async (input) => ({
      id: `mapping_${randomUUID()}`,
      ...input,
      mappingStatus: 'active' as const,
      lastSeenSnapshotId: input.lastSeenSnapshotId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      brokenAt: null,
    } as MenuMapping)),
    update: vi.fn().mockImplementation(async (id, input) => ({
      id,
      restaurantId: 'r1',
      locationId: 'l1',
      entityType: 'item' as const,
      aetherId: 'aether_test',
      providerId: 'provider_test',
      providerName: input.providerName ?? 'Test',
      mappingStatus: input.mappingStatus ?? 'active' as const,
      lastSeenSnapshotId: input.lastSeenSnapshotId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      brokenAt: input.brokenAt ?? null,
    } as MenuMapping)),
    findActiveByLocation: vi.fn().mockResolvedValue([]),
    findByProviderId: vi.fn().mockResolvedValue(null),
    findByAetherId: vi.fn().mockResolvedValue(null),
    markBroken: vi.fn().mockImplementation(async (id) => ({
      id,
      restaurantId: 'r1',
      locationId: 'l1',
      entityType: 'item' as const,
      aetherId: 'aether_test',
      providerId: 'provider_test',
      providerName: 'Test',
      mappingStatus: 'broken' as const,
      lastSeenSnapshotId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      brokenAt: new Date(),
    } as MenuMapping)),
    archive: vi.fn(),
    findBrokenByLocation: vi.fn().mockResolvedValue([]),
  };

  const cursorRepo: SyncCursorRepository = {
    upsert: vi.fn().mockImplementation(async (input) => ({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SyncCursor)),
    findByLocation: vi.fn().mockResolvedValue(null),
    findByRestaurant: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
  };

  return { snapshotRepo, mappingRepo, cursorRepo };
}

/**
 * Create a mock PosProvider.
 */
function createMockProvider(menu: ProviderMenu): PosProvider {
  return {
    providerId: 'mock',
    getMenu: vi.fn().mockResolvedValue(ok(menu)),
    getAvailability: vi.fn(),
    getOpenCheck: vi.fn(),
    submitOrder: vi.fn(),
    getOrder: vi.fn(),
  };
}

/**
 * Create test input for importMenu.
 */
function createTestInput(provider: PosProvider): ImportMenuInput {
  return {
    restaurantId: 'r1',
    locationId: 'l1',
    posProvider: provider,
    principal: {
      context: { kind: 'service' },
      role: 'platform_operator',
      scope: {
        restaurantId: 'r1',
        locationId: 'l1',
      },
    } as Principal,
  };
}

describe('importMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful import on first run', () => {
    it('imports menu with all new mappings', async () => {
      const menu = createTestMenu({
        categories: [{ id: 'cat_1', name: 'Starters' }],
        items: [
          { id: 'item_1', name: 'Salad', categoryId: 'cat_1' },
          { id: 'item_2', name: 'Soup', categoryId: 'cat_1', modifiers: [{ id: 'mod_1', name: 'Extra' }] },
        ],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();
      const input = createTestInput(provider);

      const result = await importMenu(input, repos);

      // Verify snapshot was saved
      expect(repos.snapshotRepo.save).toHaveBeenCalledWith({
        restaurantId: 'r1',
        locationId: 'l1',
        menuVersion: 'v1',
        rawMenu: menu,
        retrievedAt: expect.any(Date),
      });

      // Verify mappings were created: 1 category + 2 items + 1 modifier = 4 total
      expect(repos.mappingRepo.save).toHaveBeenCalledTimes(4);
      expect(result.newMappings).toHaveLength(4);
      expect(result.updatedMappings).toHaveLength(0);
      expect(result.brokenMappings).toHaveLength(0);

      // Verify statistics
      expect(result.stats.categoriesProcessed).toBe(1);
      expect(result.stats.itemsProcessed).toBe(2);
      expect(result.stats.modifiersProcessed).toBe(1);
      expect(result.stats.newEntities).toBe(4);
      expect(result.stats.unchangedEntities).toBe(0);
      expect(result.stats.brokenEntities).toBe(0);

      // Verify sync cursor was updated
      expect(repos.cursorRepo.upsert).toHaveBeenCalledWith({
        locationId: 'l1',
        restaurantId: 'r1',
        lastMenuVersion: 'v1',
        lastSyncedAt: expect.any(Date),
        syncStatus: 'fresh',
        lastError: null,
      });

      // Verify audit event was recorded
      expect(recordAuditEvent).toHaveBeenCalledWith({
        action: 'menu_import',
        outcome: 'success',
        reason: 'Imported menu version v1',
        after: {
          snapshotId: expect.any(String),
          menuVersion: 'v1',
          stats: result.stats,
        },
      });
    });
  });

  describe('successful import on subsequent run', () => {
    it('updates existing mappings when provider names change', async () => {
      const menu = createTestMenu({
        items: [{ id: 'item_1', name: 'Updated Name', categoryId: 'cat_1' }],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      // Mock existing mapping with old name
      const existingMapping: MenuMapping = {
        id: 'mapping_1',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_1',
        providerName: 'Old Name',
        mappingStatus: 'active',
        lastSeenSnapshotId: 'old_snapshot',
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([existingMapping]);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      // Verify mapping was updated
      expect(repos.mappingRepo.update).toHaveBeenCalledWith(
        'mapping_1',
        expect.objectContaining({
          providerName: 'Updated Name',
          lastSeenSnapshotId: expect.any(String),
        })
      );

      expect(result.newMappings.length).toBeGreaterThan(0); // Category is new
      expect(result.updatedMappings).toHaveLength(1);
      expect(result.brokenMappings).toHaveLength(0);
    });

    it('does not update mappings when nothing changes', async () => {
      const menu = createTestMenu({
        items: [{ id: 'item_1', name: 'Same Name', categoryId: 'cat_1' }],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      const snapshotId = 'snapshot_123';
      repos.snapshotRepo.save = vi.fn().mockResolvedValue({
        id: snapshotId,
        restaurantId: 'r1',
        locationId: 'l1',
        menuVersion: 'v1',
        rawMenu: menu,
        retrievedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock existing mapping with same name and snapshot
      const existingMapping: MenuMapping = {
        id: 'mapping_1',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_1',
        providerName: 'Same Name',
        mappingStatus: 'active',
        lastSeenSnapshotId: snapshotId,
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([existingMapping]);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      // Verify mapping was NOT updated
      expect(repos.mappingRepo.update).not.toHaveBeenCalledWith('mapping_1', expect.anything());
      expect(result.updatedMappings).toHaveLength(0);
      expect(result.stats.unchangedEntities).toBeGreaterThan(0);
    });
  });

  describe('broken mapping detection', () => {
    it('detects broken mappings when provider IDs disappear', async () => {
      const menu = createTestMenu({
        items: [{ id: 'item_2', name: 'New Item', categoryId: 'cat_1' }],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      // Mock existing mapping for item that no longer exists
      const existingMapping: MenuMapping = {
        id: 'mapping_old',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_1', // This ID is not in the new menu
        providerName: 'Old Item',
        mappingStatus: 'active',
        lastSeenSnapshotId: 'old_snapshot',
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([existingMapping]);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      // Verify mapping was marked as broken
      expect(repos.mappingRepo.markBroken).toHaveBeenCalledWith('mapping_old');
      expect(result.brokenMappings).toHaveLength(1);
      expect(result.stats.brokenEntities).toBe(1);
    });

    it('never auto-remaps broken mappings (ADR-0006 requirement)', async () => {
      const menu = createTestMenu({
        items: [
          { id: 'item_1', name: 'Item 1', categoryId: 'cat_1' },
          { id: 'item_new', name: 'Item 1', categoryId: 'cat_1' }, // Same name, different ID
        ],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      // Mock existing mapping that will become broken
      const existingMapping: MenuMapping = {
        id: 'mapping_old',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_old', // This ID is not in the new menu
        providerName: 'Item 1',
        mappingStatus: 'active',
        lastSeenSnapshotId: 'old_snapshot',
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([existingMapping]);

      const input = createTestInput(provider);
      await importMenu(input, repos);

      // Verify old mapping was marked as broken
      expect(repos.mappingRepo.markBroken).toHaveBeenCalledWith('mapping_old');
      
      // Verify new mappings were created for the new IDs (not reused)
      expect(repos.mappingRepo.save).toHaveBeenCalled();
      
      // Critical: The broken mapping should NOT be updated to point to the new ID
      expect(repos.mappingRepo.update).not.toHaveBeenCalledWith(
        'mapping_old',
        expect.objectContaining({ providerId: 'item_new' })
      );
    });

    it('does not mark already broken mappings as broken again', async () => {
      const menu = createTestMenu({
        items: [{ id: 'item_2', name: 'Item 2', categoryId: 'cat_1' }],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      // Mock existing broken mapping
      const brokenMapping: MenuMapping = {
        id: 'mapping_broken',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_1',
        providerName: 'Old Item',
        mappingStatus: 'broken', // Already broken
        lastSeenSnapshotId: 'old_snapshot',
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: new Date(),
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([brokenMapping]);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      // Verify markBroken was NOT called for already broken mapping
      expect(repos.mappingRepo.markBroken).not.toHaveBeenCalled();
      expect(result.brokenMappings).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('handles provider errors gracefully', async () => {
      const provider: PosProvider = {
        providerId: 'mock',
        getMenu: vi.fn().mockResolvedValue(err({
          kind: 'unavailable',
          message: 'Provider is offline',
          retryable: true,
        })),
        getAvailability: vi.fn(),
        getOpenCheck: vi.fn(),
        submitOrder: vi.fn(),
        getOrder: vi.fn(),
      };
      const repos = createMockRepos();
      const input = createTestInput(provider);

      await expect(importMenu(input, repos)).rejects.toThrow('Failed to fetch menu from provider');

      // Verify sync cursor was updated to error state
      expect(repos.cursorRepo.upsert).toHaveBeenCalledWith({
        locationId: 'l1',
        restaurantId: 'r1',
        syncStatus: 'error',
        lastError: expect.stringContaining('Provider is offline'),
      });

      // Verify failure audit event was recorded
      expect(recordAuditEvent).toHaveBeenCalledWith({
        action: 'menu_import',
        outcome: 'failure',
        reason: expect.stringContaining('Provider is offline'),
      });
    });

    it('updates sync cursor to error status on failure', async () => {
      const menu = createTestMenu();
      const provider = createMockProvider(menu);
      const repos = createMockRepos();
      
      // Make snapshot save fail
      repos.snapshotRepo.save = vi.fn().mockRejectedValue(new Error('Database error'));

      const input = createTestInput(provider);

      await expect(importMenu(input, repos)).rejects.toThrow('Database error');

      // Verify sync cursor was updated to error state
      expect(repos.cursorRepo.upsert).toHaveBeenCalledWith({
        locationId: 'l1',
        restaurantId: 'r1',
        syncStatus: 'error',
        lastError: 'Database error',
      });
    });

    it('records audit events for both success and failure', async () => {
      const menu = createTestMenu();
      const provider = createMockProvider(menu);
      const repos = createMockRepos();
      const input = createTestInput(provider);

      // Success case
      await importMenu(input, repos);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'menu_import',
          outcome: 'success',
        })
      );

      vi.clearAllMocks();

      // Failure case
      repos.snapshotRepo.save = vi.fn().mockRejectedValue(new Error('Test error'));
      await expect(importMenu(input, repos)).rejects.toThrow();
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'menu_import',
          outcome: 'failure',
        })
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty menus', async () => {
      const menu = createTestMenu({
        categories: [],
        items: [],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();
      const input = createTestInput(provider);

      const result = await importMenu(input, repos);

      expect(result.stats.categoriesProcessed).toBe(0);
      expect(result.stats.itemsProcessed).toBe(0);
      expect(result.stats.modifiersProcessed).toBe(0);
      expect(result.newMappings).toHaveLength(0);
      expect(result.snapshot).toBeDefined();
    });

    it('handles menus with no changes', async () => {
      const menu = createTestMenu();
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      const snapshotId = 'snapshot_123';
      repos.snapshotRepo.save = vi.fn().mockResolvedValue({
        id: snapshotId,
        restaurantId: 'r1',
        locationId: 'l1',
        menuVersion: 'v1',
        rawMenu: menu,
        retrievedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock existing mappings that match exactly
      const existingMappings: MenuMapping[] = [
        {
          id: 'mapping_cat',
          restaurantId: 'r1',
          locationId: 'l1',
          entityType: 'category',
          aetherId: 'aether_cat_1',
          providerId: 'cat_1',
          providerName: 'Category 1',
          mappingStatus: 'active',
          lastSeenSnapshotId: snapshotId,
          createdAt: new Date(),
          updatedAt: new Date(),
          brokenAt: null,
        },
        {
          id: 'mapping_item',
          restaurantId: 'r1',
          locationId: 'l1',
          entityType: 'item',
          aetherId: 'aether_item_1',
          providerId: 'item_1',
          providerName: 'Item 1',
          mappingStatus: 'active',
          lastSeenSnapshotId: snapshotId,
          createdAt: new Date(),
          updatedAt: new Date(),
          brokenAt: null,
        },
      ];
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue(existingMappings);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      expect(result.newMappings).toHaveLength(0);
      expect(result.updatedMappings).toHaveLength(0);
      expect(result.brokenMappings).toHaveLength(0);
      expect(result.stats.unchangedEntities).toBe(2);
    });

    it('processes categories, items, and modifiers correctly', async () => {
      const menu = createTestMenu({
        categories: [
          { id: 'cat_1', name: 'Cat 1' },
          { id: 'cat_2', name: 'Cat 2' },
        ],
        items: [
          { id: 'item_1', name: 'Item 1', categoryId: 'cat_1' },
          { id: 'item_2', name: 'Item 2', categoryId: 'cat_2', modifiers: [
            { id: 'mod_1', name: 'Mod 1' },
            { id: 'mod_2', name: 'Mod 2' },
          ]},
        ],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();
      const input = createTestInput(provider);

      const result = await importMenu(input, repos);

      // Verify all entity types were processed
      const savedCalls = vi.mocked(repos.mappingRepo.save).mock.calls;
      const categoryMappings = savedCalls.filter(call => call[0].entityType === 'category');
      const itemMappings = savedCalls.filter(call => call[0].entityType === 'item');
      const modifierMappings = savedCalls.filter(call => call[0].entityType === 'modifier');

      expect(categoryMappings).toHaveLength(2);
      expect(itemMappings).toHaveLength(2);
      expect(modifierMappings).toHaveLength(2);

      expect(result.stats.categoriesProcessed).toBe(2);
      expect(result.stats.itemsProcessed).toBe(2);
      expect(result.stats.modifiersProcessed).toBe(2);
    });
  });

  describe('statistics calculation', () => {
    it('calculates statistics correctly', async () => {
      const menu = createTestMenu({
        categories: [{ id: 'cat_1', name: 'Cat 1' }],
        items: [
          { id: 'item_1', name: 'Item 1', categoryId: 'cat_1' },
          { id: 'item_2', name: 'Item 2', categoryId: 'cat_1', modifiers: [
            { id: 'mod_1', name: 'Mod 1' },
          ]},
        ],
      });
      const provider = createMockProvider(menu);
      const repos = createMockRepos();

      // Mock one existing mapping that will be updated
      const existingMapping: MenuMapping = {
        id: 'mapping_1',
        restaurantId: 'r1',
        locationId: 'l1',
        entityType: 'item',
        aetherId: 'aether_item_1',
        providerId: 'item_1',
        providerName: 'Old Name',
        mappingStatus: 'active',
        lastSeenSnapshotId: 'old_snapshot',
        createdAt: new Date(),
        updatedAt: new Date(),
        brokenAt: null,
      };
      repos.mappingRepo.findActiveByLocation = vi.fn().mockResolvedValue([existingMapping]);

      const input = createTestInput(provider);
      const result = await importMenu(input, repos);

      expect(result.stats.categoriesProcessed).toBe(1);
      expect(result.stats.itemsProcessed).toBe(2);
      expect(result.stats.modifiersProcessed).toBe(1);
      expect(result.stats.newEntities).toBeGreaterThan(0);
      expect(result.stats.unchangedEntities).toBe(0);
      expect(result.stats.brokenEntities).toBe(0);
    });
  });
});

// Made with Bob

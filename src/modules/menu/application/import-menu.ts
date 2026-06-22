/**
 * Menu import and normalization application service.
 *
 * Orchestrates the complete menu import workflow per ADR 0006 (Menu Ownership):
 * 1. Fetch menu from provider
 * 2. Save immutable snapshot
 * 3. Process categories, items, and modifiers
 * 4. Create/update/detect broken mappings
 * 5. Update sync cursor
 * 6. Record audit trail
 *
 * Critical invariant: NEVER auto-remap broken mappings. When a provider ID
 * disappears, mark the mapping as broken and require human intervention.
 */

import { randomUUID } from 'node:crypto';

import { recordAuditEvent } from '@/modules/audit';
import type { PosProvider } from '@/modules/spoton/contracts/pos-provider';
import type {
  ProviderMenu,
  ProviderMenuCategory,
  ProviderMenuItem,
  ProviderModifier,
} from '@/modules/spoton/domain/menu';
import type { Principal } from '@/shared/auth/principal';
import { createLogger } from '@/shared/observability/logger';
import { newCorrelationId } from '@/shared/observability/correlation';

import type {
  MenuSnapshotRepository,
  MenuMappingRepository,
  SyncCursorRepository,
} from './ports';
import type { MenuSnapshot } from '../domain/menu-snapshot';
import type { MenuMapping, EntityType } from '../domain/menu-mapping';
import { markSyncSuccess, markSyncError } from '../domain/sync-cursor';

const logger = createLogger('menu.import');

/**
 * Input for menu import operation.
 */
export interface ImportMenuInput {
  /** Restaurant this menu belongs to. */
  readonly restaurantId: string;
  /** Location to import menu for. */
  readonly locationId: string;
  /** Provider to fetch menu from. */
  readonly posProvider: PosProvider;
  /** Principal performing the import (for audit trail). */
  readonly principal: Principal;
}

/**
 * Statistics from menu import operation.
 */
export interface ImportStats {
  /** Number of categories processed. */
  readonly categoriesProcessed: number;
  /** Number of items processed. */
  readonly itemsProcessed: number;
  /** Number of modifiers processed. */
  readonly modifiersProcessed: number;
  /** Number of new entities created. */
  readonly newEntities: number;
  /** Number of entities that remained unchanged. */
  readonly unchangedEntities: number;
  /** Number of entities detected as broken. */
  readonly brokenEntities: number;
}

/**
 * Result of menu import operation.
 */
export interface ImportMenuResult {
  /** The saved menu snapshot. */
  readonly snapshot: MenuSnapshot;
  /** New mappings created during import. */
  readonly newMappings: MenuMapping[];
  /** Existing mappings that were updated. */
  readonly updatedMappings: MenuMapping[];
  /** Mappings detected as broken (provider ID no longer exists). */
  readonly brokenMappings: MenuMapping[];
  /** Import statistics. */
  readonly stats: ImportStats;
}

/**
 * Dependencies for menu import service.
 */
export interface ImportMenuDeps {
  readonly snapshotRepo: MenuSnapshotRepository;
  readonly mappingRepo: MenuMappingRepository;
  readonly cursorRepo: SyncCursorRepository;
}

/**
 * Import and normalize a menu from the provider.
 *
 * This is the main orchestration function that coordinates the entire menu
 * import workflow. It ensures data consistency, proper error handling, and
 * complete audit trail.
 *
 * @param input - Import parameters including location and provider
 * @param deps - Repository dependencies
 * @returns Import result with snapshot, mappings, and statistics
 * @throws Error if import fails (sync cursor will be marked as error)
 */
export async function importMenu(
  input: ImportMenuInput,
  deps: ImportMenuDeps,
): Promise<ImportMenuResult> {
  const correlationId = newCorrelationId();
  const startTime = Date.now();

  logger.info('Starting menu import', {
    correlationId,
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    providerId: input.posProvider.providerId,
  });

  try {
    // Step 1: Fetch menu from provider
    const providerResult = await input.posProvider.getMenu({
      location: { locationId: input.locationId },
    });

    if (!providerResult.ok) {
      throw new Error(
        `Failed to fetch menu from provider: ${providerResult.error.message}`,
      );
    }

    const providerMenu = providerResult.value;

    logger.debug('Fetched menu from provider', {
      correlationId,
      menuVersion: providerMenu.menuVersion,
      categoriesCount: providerMenu.categories.length,
      itemsCount: providerMenu.items.length,
    });

    // Step 2: Save immutable snapshot
    const snapshot = await deps.snapshotRepo.save({
      restaurantId: input.restaurantId,
      locationId: input.locationId,
      menuVersion: providerMenu.menuVersion,
      rawMenu: providerMenu,
      retrievedAt: new Date(providerMenu.retrievedAt),
    });

    logger.info('Saved menu snapshot', {
      correlationId,
      snapshotId: snapshot.id,
      menuVersion: snapshot.menuVersion,
    });

    // Step 3: Load existing mappings for comparison
    const existingMappings = await deps.mappingRepo.findActiveByLocation(
      input.locationId,
    );

    const existingMappingsByKey = new Map<string, MenuMapping>();
    for (const mapping of existingMappings) {
      const key = buildMappingKey(mapping.entityType, mapping.providerId);
      existingMappingsByKey.set(key, mapping);
    }

    logger.debug('Loaded existing mappings', {
      correlationId,
      existingCount: existingMappings.length,
    });

    // Step 4: Process all entities and track results
    const newMappings: MenuMapping[] = [];
    const updatedMappings: MenuMapping[] = [];
    const seenProviderIds = new Set<string>();

    // Process categories
    for (const category of providerMenu.categories) {
      const result = await processCategory(
        category,
        input,
        snapshot.id,
        existingMappingsByKey,
        deps.mappingRepo,
      );
      if (result.isNew) {
        newMappings.push(result.mapping);
      } else if (result.wasUpdated) {
        updatedMappings.push(result.mapping);
      }
      seenProviderIds.add(buildMappingKey('category', category.categoryId));
    }

    // Process items
    for (const item of providerMenu.items) {
      const result = await processItem(
        item,
        input,
        snapshot.id,
        existingMappingsByKey,
        deps.mappingRepo,
      );
      if (result.isNew) {
        newMappings.push(result.mapping);
      } else if (result.wasUpdated) {
        updatedMappings.push(result.mapping);
      }
      seenProviderIds.add(buildMappingKey('item', item.itemId));

      // Process modifiers within each item
      for (const group of item.modifierGroups) {
        for (const modifier of group.modifiers) {
          const modResult = await processModifier(
            modifier,
            input,
            snapshot.id,
            existingMappingsByKey,
            deps.mappingRepo,
          );
          if (modResult.isNew) {
            newMappings.push(modResult.mapping);
          } else if (modResult.wasUpdated) {
            updatedMappings.push(modResult.mapping);
          }
          seenProviderIds.add(buildMappingKey('modifier', modifier.modifierId));
        }
      }
    }

    // Step 5: Detect broken mappings
    const brokenMappings: MenuMapping[] = [];
    for (const [key, mapping] of existingMappingsByKey) {
      if (!seenProviderIds.has(key) && mapping.mappingStatus === 'active') {
        // Provider ID no longer exists - mark as broken
        const broken = await deps.mappingRepo.markBroken(mapping.id);
        brokenMappings.push(broken);
        logger.warn('Detected broken mapping', {
          correlationId,
          mappingId: mapping.id,
          entityType: mapping.entityType,
          providerId: mapping.providerId,
          providerName: mapping.providerName,
        });
      }
    }

    // Step 6: Update sync cursor
    await deps.cursorRepo.upsert({
      locationId: input.locationId,
      restaurantId: input.restaurantId,
      ...markSyncSuccess(providerMenu.menuVersion),
    });

    // Calculate statistics
    const stats: ImportStats = {
      categoriesProcessed: providerMenu.categories.length,
      itemsProcessed: providerMenu.items.length,
      modifiersProcessed: countModifiers(providerMenu),
      newEntities: newMappings.length,
      unchangedEntities:
        existingMappings.length - updatedMappings.length - brokenMappings.length,
      brokenEntities: brokenMappings.length,
    };

    const duration = Date.now() - startTime;

    logger.info('Menu import completed', {
      correlationId,
      snapshotId: snapshot.id,
      duration,
      stats,
    });

    // Step 7: Record audit event
    await recordAuditEvent({
      action: 'menu_import',
      outcome: 'success',
      reason: `Imported menu version ${providerMenu.menuVersion}`,
      after: {
        snapshotId: snapshot.id,
        menuVersion: providerMenu.menuVersion,
        stats,
      },
    });

    return {
      snapshot,
      newMappings,
      updatedMappings,
      brokenMappings,
      stats,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during menu import';

    logger.error('Menu import failed', {
      correlationId,
      error: errorMessage,
      duration,
      restaurantId: input.restaurantId,
      locationId: input.locationId,
    });

    // Update sync cursor to error state
    try {
      await deps.cursorRepo.upsert({
        locationId: input.locationId,
        restaurantId: input.restaurantId,
        ...markSyncError(errorMessage),
      });
    } catch (cursorError) {
      logger.error('Failed to update sync cursor after import error', {
        correlationId,
        error: cursorError instanceof Error ? cursorError.message : 'Unknown error',
      });
    }

    // Record audit event for failure
    await recordAuditEvent({
      action: 'menu_import',
      outcome: 'failure',
      reason: errorMessage,
    });

    // Re-throw for caller to handle
    throw error;
  }
}

/**
 * Result of processing a single entity.
 */
interface ProcessResult {
  readonly mapping: MenuMapping;
  readonly isNew: boolean;
  readonly wasUpdated: boolean;
}

/**
 * Process a category and create/update its mapping.
 */
async function processCategory(
  category: ProviderMenuCategory,
  input: ImportMenuInput,
  snapshotId: string,
  existingMappings: Map<string, MenuMapping>,
  repo: MenuMappingRepository,
): Promise<ProcessResult> {
  const key = buildMappingKey('category', category.categoryId);
  const existing = existingMappings.get(key);

  if (existing) {
    // Mapping exists - check if it needs updating
    const needsUpdate =
      existing.providerName !== category.name ||
      existing.lastSeenSnapshotId !== snapshotId;

    if (needsUpdate && existing.mappingStatus === 'active') {
      const updated = await repo.update(existing.id, {
        providerName: category.name,
        lastSeenSnapshotId: snapshotId,
      });
      return { mapping: updated, isNew: false, wasUpdated: true };
    }

    return { mapping: existing, isNew: false, wasUpdated: false };
  }

  // Create new mapping
  const mapping = await repo.save({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    entityType: 'category',
    aetherId: generateAetherId(),
    providerId: category.categoryId,
    providerName: category.name,
    lastSeenSnapshotId: snapshotId,
  });

  return { mapping, isNew: true, wasUpdated: false };
}

/**
 * Process an item and create/update its mapping.
 */
async function processItem(
  item: ProviderMenuItem,
  input: ImportMenuInput,
  snapshotId: string,
  existingMappings: Map<string, MenuMapping>,
  repo: MenuMappingRepository,
): Promise<ProcessResult> {
  const key = buildMappingKey('item', item.itemId);
  const existing = existingMappings.get(key);

  if (existing) {
    // Mapping exists - check if it needs updating
    const needsUpdate =
      existing.providerName !== item.name ||
      existing.lastSeenSnapshotId !== snapshotId;

    if (needsUpdate && existing.mappingStatus === 'active') {
      const updated = await repo.update(existing.id, {
        providerName: item.name,
        lastSeenSnapshotId: snapshotId,
      });
      return { mapping: updated, isNew: false, wasUpdated: true };
    }

    return { mapping: existing, isNew: false, wasUpdated: false };
  }

  // Create new mapping
  const mapping = await repo.save({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    entityType: 'item',
    aetherId: generateAetherId(),
    providerId: item.itemId,
    providerName: item.name,
    lastSeenSnapshotId: snapshotId,
  });

  return { mapping, isNew: true, wasUpdated: false };
}

/**
 * Process a modifier and create/update its mapping.
 */
async function processModifier(
  modifier: ProviderModifier,
  input: ImportMenuInput,
  snapshotId: string,
  existingMappings: Map<string, MenuMapping>,
  repo: MenuMappingRepository,
): Promise<ProcessResult> {
  const key = buildMappingKey('modifier', modifier.modifierId);
  const existing = existingMappings.get(key);

  if (existing) {
    // Mapping exists - check if it needs updating
    const needsUpdate =
      existing.providerName !== modifier.name ||
      existing.lastSeenSnapshotId !== snapshotId;

    if (needsUpdate && existing.mappingStatus === 'active') {
      const updated = await repo.update(existing.id, {
        providerName: modifier.name,
        lastSeenSnapshotId: snapshotId,
      });
      return { mapping: updated, isNew: false, wasUpdated: true };
    }

    return { mapping: existing, isNew: false, wasUpdated: false };
  }

  // Create new mapping
  const mapping = await repo.save({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    entityType: 'modifier',
    aetherId: generateAetherId(),
    providerId: modifier.modifierId,
    providerName: modifier.name,
    lastSeenSnapshotId: snapshotId,
  });

  return { mapping, isNew: true, wasUpdated: false };
}

/**
 * Generate a new AETHER ID for an entity.
 * Uses UUID v4 for globally unique, stable identifiers.
 */
function generateAetherId(): string {
  return `aether_${randomUUID()}`;
}

/**
 * Build a lookup key for a mapping.
 * Combines entity type and provider ID for unique identification.
 */
function buildMappingKey(entityType: EntityType, providerId: string): string {
  return `${entityType}:${providerId}`;
}

/**
 * Count total modifiers across all items in a menu.
 */
function countModifiers(menu: ProviderMenu): number {
  let count = 0;
  for (const item of menu.items) {
    for (const group of item.modifierGroups) {
      count += group.modifiers.length;
    }
  }
  return count;
}

// Made with Bob
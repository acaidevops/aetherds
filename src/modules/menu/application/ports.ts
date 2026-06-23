/**
 * Application layer ports for the menu module.
 *
 * These repository interfaces define the contracts for persistence operations
 * on menu domain models. Implementations will be provided in the infrastructure
 * layer (e.g., Supabase repositories). Following the ports and adapters pattern
 * from ADR 0004, these interfaces allow the application layer to remain
 * independent of specific persistence technologies.
 */

import type {
  MenuSnapshot,
  CreateMenuSnapshotInput,
} from '../domain/menu-snapshot';
import type {
  MenuMapping,
  CreateMenuMappingInput,
  UpdateMenuMappingInput,
  EntityType,
} from '../domain/menu-mapping';
import type {
  SyncCursor,
  UpsertSyncCursorInput,
} from '../domain/sync-cursor';

/**
 * Repository for menu snapshot persistence.
 * Snapshots are immutable and append-only.
 */
export interface MenuSnapshotRepository {
  /**
   * Save a new menu snapshot.
   * @returns The created snapshot with generated id and createdAt.
   */
  save(input: CreateMenuSnapshotInput): Promise<MenuSnapshot>;

  /**
   * Find the most recent snapshot for a location.
   * @returns The latest snapshot, or null if none exist.
   */
  findLatestByLocation(locationId: string): Promise<MenuSnapshot | null>;

  /**
   * Find a snapshot by location and menu version.
   * @returns The matching snapshot, or null if not found.
   */
  findByVersion(locationId: string, menuVersion: string): Promise<MenuSnapshot | null>;

  /**
   * Find all snapshots for a location, ordered by retrievedAt descending.
   * @param limit Maximum number of snapshots to return.
   */
  findByLocation(locationId: string, limit?: number): Promise<MenuSnapshot[]>;
}

/**
 * Repository for menu mapping persistence.
 * Mappings track the relationship between AETHER and provider IDs.
 */
export interface MenuMappingRepository {
  /**
   * Save a new menu mapping.
   * @returns The created mapping with generated id, createdAt, and updatedAt.
   */
  save(input: CreateMenuMappingInput): Promise<MenuMapping>;

  /**
   * Update an existing menu mapping.
   * @returns The updated mapping.
   */
  update(id: string, input: UpdateMenuMappingInput): Promise<MenuMapping>;

  /**
   * Find all active mappings for a location.
   * @param entityType Optional filter by entity type.
   */
  findActiveByLocation(
    locationId: string,
    entityType?: EntityType
  ): Promise<MenuMapping[]>;

  /**
   * Find a mapping by provider ID and entity type.
   * @returns The matching mapping, or null if not found.
   */
  findByProviderId(
    locationId: string,
    providerId: string,
    entityType: EntityType
  ): Promise<MenuMapping | null>;

  /**
   * Find a mapping by AETHER ID.
   * @returns The matching mapping, or null if not found.
   */
  findByAetherId(aetherId: string): Promise<MenuMapping | null>;

  /**
   * Mark a mapping as broken (provider ID no longer exists).
   * @returns The updated mapping.
   */
  markBroken(id: string): Promise<MenuMapping>;

  /**
   * Archive a mapping (intentionally retired).
   * @returns The updated mapping.
   */
  archive(id: string): Promise<MenuMapping>;

  /**
   * Find all broken mappings for a location.
   * @param entityType Optional filter by entity type.
   */
  findBrokenByLocation(
    locationId: string,
    entityType?: EntityType
  ): Promise<MenuMapping[]>;
}

/**
 * Repository for sync cursor persistence.
 * Each location has exactly one cursor tracking sync state.
 */
export interface SyncCursorRepository {
  /**
   * Create or update a sync cursor for a location.
   * @returns The upserted cursor.
   */
  upsert(input: UpsertSyncCursorInput): Promise<SyncCursor>;

  /**
   * Find the sync cursor for a location.
   * @returns The cursor, or null if not found.
   */
  findByLocation(locationId: string): Promise<SyncCursor | null>;

  /**
   * Find all cursors for a restaurant.
   */
  findByRestaurant(restaurantId: string): Promise<SyncCursor[]>;

  /**
   * Find all cursors with a specific sync status.
   * Useful for monitoring and alerting.
   */
  findByStatus(status: 'fresh' | 'stale' | 'error'): Promise<SyncCursor[]>;
}

// Made with Bob

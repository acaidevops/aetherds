/**
 * Public surface for the menu module.
 *
 * Responsibility: Menu import, normalization, and mapping management (ADR 0006:
 * Menu Ownership). Handles immutable snapshots of provider menus, stable AETHER
 * ↔ provider ID mappings, and sync cursor tracking for change detection.
 *
 * Per ADR 0004, cross-module imports MUST go through this barrel; domain models
 * and application ports are exported for use by other modules and the composition
 * root, while infrastructure implementations will be added as they are created.
 *
 * @example Integration Example - Complete Menu Import Flow
 * ```typescript
 * import { importMenu } from '@/modules/menu';
 * import {
 *   SupabaseMenuSnapshotRepository,
 *   SupabaseMenuMappingRepository,
 *   SupabaseSyncCursorRepository,
 * } from '@/modules/menu';
 * import { createMockPosProvider } from '@/modules/spoton/infrastructure/mock-pos-provider';
 * import { createClient } from '@/shared/db/client';
 * import type { Principal } from '@/shared/auth/principal';
 *
 * // 1. Set up dependencies (typically done at composition root)
 * const supabase = createClient();
 * const deps = {
 *   snapshotRepo: new SupabaseMenuSnapshotRepository(supabase),
 *   mappingRepo: new SupabaseMenuMappingRepository(supabase),
 *   cursorRepo: new SupabaseSyncCursorRepository(supabase),
 * };
 *
 * // 2. Create a POS provider (mock or real)
 * const posProvider = createMockPosProvider({
 *   providerId: 'spoton',
 *   mode: 'normal', // or 'degraded' for testing error handling
 * });
 *
 * // 3. Define the principal (from authentication context)
 * const principal: Principal = {
 *   userId: 'user_123',
 *   context: { kind: 'service' },
 *   role: 'platform_operator',
 *   scope: {
 *     restaurantId: 'restaurant_abc',
 *     locationId: 'location_xyz',
 *   },
 * };
 *
 * // 4. Import the menu
 * try {
 *   const result = await importMenu(
 *     {
 *       restaurantId: 'restaurant_abc',
 *       locationId: 'location_xyz',
 *       posProvider,
 *       principal,
 *     },
 *     deps
 *   );
 *
 *   // 5. Process the results
 *   console.log('Menu imported successfully!');
 *   console.log(`Snapshot ID: ${result.snapshot.id}`);
 *   console.log(`Menu Version: ${result.snapshot.menuVersion}`);
 *   console.log(`New mappings: ${result.newMappings.length}`);
 *   console.log(`Updated mappings: ${result.updatedMappings.length}`);
 *   console.log(`Broken mappings: ${result.brokenMappings.length}`);
 *   console.log('Statistics:', result.stats);
 *
 *   // 6. Handle broken mappings (require human intervention per ADR-0006)
 *   if (result.brokenMappings.length > 0) {
 *     console.warn('⚠️  Broken mappings detected - manual review required:');
 *     for (const mapping of result.brokenMappings) {
 *       console.warn(`  - ${mapping.entityType}: ${mapping.providerName} (${mapping.providerId})`);
 *     }
 *   }
 * } catch (error) {
 *   console.error('Menu import failed:', error);
 *   // Error is logged, audit event recorded, and sync cursor updated automatically
 * }
 * ```
 */

// Domain types: Menu Snapshot
export type {
  MenuSnapshot,
  CreateMenuSnapshotInput,
} from './domain/menu-snapshot';

// Domain types: Menu Mapping
export type {
  MenuMapping,
  CreateMenuMappingInput,
  UpdateMenuMappingInput,
  MappingStatus,
  EntityType,
} from './domain/menu-mapping';
export {
  isActive,
  isBroken,
  markBroken,
  markArchived,
} from './domain/menu-mapping';

// Domain types: Sync Cursor
export type {
  SyncCursor,
  UpsertSyncCursorInput,
  SyncStatus,
} from './domain/sync-cursor';
export {
  isFresh,
  isStale,
  hasError,
  markSyncSuccess,
  markSyncError,
  markSyncStale,
} from './domain/sync-cursor';

// Application ports
export type {
  MenuSnapshotRepository,
  MenuMappingRepository,
  SyncCursorRepository,
} from './application/ports';

// Application services
export {
  importMenu,
  type ImportMenuInput,
  type ImportMenuResult,
  type ImportStats,
  type ImportMenuDeps,
} from './application/import-menu';

// Infrastructure implementations (composition root only)
export { SupabaseMenuSnapshotRepository } from './infrastructure/supabase-menu-snapshot-repository';
export { SupabaseMenuMappingRepository } from './infrastructure/supabase-menu-mapping-repository';
export { SupabaseSyncCursorRepository } from './infrastructure/supabase-sync-cursor-repository';

// Made with Bob

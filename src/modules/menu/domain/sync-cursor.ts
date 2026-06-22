/**
 * Sync cursor domain model.
 *
 * Per-location menu version tracking and freshness monitoring. Each location
 * has exactly one cursor that tracks the most recent menu version synced and
 * the operational status of the sync process. Used for change detection and
 * monitoring sync health.
 */

/**
 * Freshness status of menu sync for a location.
 * - fresh: Recently synced, menu is up to date
 * - stale: Sync is overdue, menu may be outdated
 * - error: Last sync attempt failed
 */
export type SyncStatus = 'fresh' | 'stale' | 'error';

/**
 * Cursor tracking menu sync state for a location.
 * Maps to the `sync_cursors` table (one row per location).
 */
export interface SyncCursor {
  /** Location this cursor tracks (primary key). */
  readonly locationId: string;
  /** Restaurant this location belongs to. */
  readonly restaurantId: string;
  /** Most recent menu version from snapshots (null if never synced). */
  readonly lastMenuVersion: string | null;
  /** When the last successful sync completed (null if never synced). */
  readonly lastSyncedAt: Date | null;
  /** Current freshness status of the sync. */
  readonly syncStatus: SyncStatus;
  /** Diagnostic information from most recent failed sync (null when fresh/stale). */
  readonly lastError: string | null;
  /** When this cursor was created. */
  readonly createdAt: Date;
  /** When this cursor was last updated. */
  readonly updatedAt: Date;
}

/**
 * Input for creating or updating a sync cursor.
 * The createdAt and updatedAt will be managed by the repository.
 */
export interface UpsertSyncCursorInput {
  readonly locationId: string;
  readonly restaurantId: string;
  readonly lastMenuVersion?: string | null;
  readonly lastSyncedAt?: Date | null;
  readonly syncStatus: SyncStatus;
  readonly lastError?: string | null;
}

/**
 * Check if the sync is fresh (recently synced, no errors).
 */
export function isFresh(cursor: Pick<SyncCursor, 'syncStatus'>): boolean {
  return cursor.syncStatus === 'fresh';
}

/**
 * Check if the sync is stale (overdue for refresh).
 */
export function isStale(cursor: Pick<SyncCursor, 'syncStatus'>): boolean {
  return cursor.syncStatus === 'stale';
}

/**
 * Check if the sync has an error.
 */
export function hasError(cursor: Pick<SyncCursor, 'syncStatus'>): boolean {
  return cursor.syncStatus === 'error';
}

/**
 * Create an input to mark sync as successful.
 */
export function markSyncSuccess(menuVersion: string): Pick<UpsertSyncCursorInput, 'lastMenuVersion' | 'lastSyncedAt' | 'syncStatus' | 'lastError'> {
  return {
    lastMenuVersion: menuVersion,
    lastSyncedAt: new Date(),
    syncStatus: 'fresh',
    lastError: null,
  };
}

/**
 * Create an input to mark sync as failed.
 */
export function markSyncError(error: string): Pick<UpsertSyncCursorInput, 'syncStatus' | 'lastError'> {
  return {
    syncStatus: 'error',
    lastError: error,
  };
}

/**
 * Create an input to mark sync as stale.
 */
export function markSyncStale(): Pick<UpsertSyncCursorInput, 'syncStatus'> {
  return {
    syncStatus: 'stale',
  };
}

// Made with Bob

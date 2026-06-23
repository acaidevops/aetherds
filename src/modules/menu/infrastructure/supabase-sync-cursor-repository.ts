import 'server-only';

import { getServerSupabaseClient, type ServerSupabaseClient } from '@/shared/db';

import type { SyncCursor, UpsertSyncCursorInput, SyncStatus } from '../domain/sync-cursor';
import type { SyncCursorRepository } from '../application/ports';

/**
 * Supabase implementation of {@link SyncCursorRepository}.
 *
 * Manages per-location sync cursors in the `sync_cursors` table. Each location
 * has exactly one cursor tracking the most recent menu version synced and the
 * operational status of the sync process. Used for change detection and
 * monitoring sync health. RLS automatically scopes queries by JWT claims for
 * tenant isolation (ADR 0010).
 *
 * The location_id is the primary key, so upsert operations use it as the
 * conflict target. The updated_at timestamp is automatically managed by the
 * database trigger.
 */

/**
 * Database row structure for sync_cursors table.
 */
interface SyncCursorRow {
  readonly location_id: string;
  readonly restaurant_id: string;
  readonly last_menu_version: string | null;
  readonly last_synced_at: string | null;
  readonly sync_status: SyncStatus;
  readonly last_error: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Convert database row to domain model.
 * Transforms snake_case to camelCase and ISO timestamp strings to Date objects.
 */
function toSyncCursor(row: SyncCursorRow): SyncCursor {
  return {
    locationId: row.location_id,
    restaurantId: row.restaurant_id,
    lastMenuVersion: row.last_menu_version,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseSyncCursorRepository implements SyncCursorRepository {
  private readonly client: ServerSupabaseClient;

  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  /**
   * Create or update a sync cursor for a location.
   * Uses location_id as the conflict target for upsert.
   * The updated_at timestamp is automatically managed by the database trigger.
   */
  async upsert(input: UpsertSyncCursorInput): Promise<SyncCursor> {
    const upsertData: Record<string, unknown> = {
      location_id: input.locationId,
      restaurant_id: input.restaurantId,
      sync_status: input.syncStatus,
    };

    if (input.lastMenuVersion !== undefined) {
      upsertData.last_menu_version = input.lastMenuVersion;
    }
    if (input.lastSyncedAt !== undefined) {
      upsertData.last_synced_at = input.lastSyncedAt ? input.lastSyncedAt.toISOString() : null;
    }
    if (input.lastError !== undefined) {
      upsertData.last_error = input.lastError;
    }

    const { data, error } = await this.client
      .from('sync_cursors')
      .upsert(upsertData, {
        onConflict: 'location_id',
      })
      .select()
      .single<SyncCursorRow>();

    if (error) {
      throw new Error(
        `Failed to upsert sync cursor for location ${input.locationId}: ${error.message}`,
        { cause: error }
      );
    }

    if (!data) {
      throw new Error(
        `Failed to upsert sync cursor for location ${input.locationId}: no data returned`
      );
    }

    return toSyncCursor(data);
  }

  /**
   * Find the sync cursor for a location.
   * Returns null if no cursor exists (location has never been synced).
   */
  async findByLocation(locationId: string): Promise<SyncCursor | null> {
    const { data, error } = await this.client
      .from('sync_cursors')
      .select()
      .eq('location_id', locationId)
      .maybeSingle<SyncCursorRow>();

    if (error) {
      throw new Error(`Failed to find sync cursor for location ${locationId}: ${error.message}`, {
        cause: error,
      });
    }

    return data ? toSyncCursor(data) : null;
  }

  /**
   * Find all cursors for a restaurant.
   * Useful for restaurant-wide sync monitoring and reporting.
   */
  async findByRestaurant(restaurantId: string): Promise<SyncCursor[]> {
    const { data, error } = await this.client
      .from('sync_cursors')
      .select()
      .eq('restaurant_id', restaurantId)
      .returns<SyncCursorRow[]>();

    if (error) {
      throw new Error(
        `Failed to find sync cursors for restaurant ${restaurantId}: ${error.message}`,
        { cause: error }
      );
    }

    return (data ?? []).map(toSyncCursor);
  }

  /**
   * Find all cursors with a specific sync status.
   * Useful for monitoring and alerting on stale or error states.
   */
  async findByStatus(status: SyncStatus): Promise<SyncCursor[]> {
    const { data, error } = await this.client
      .from('sync_cursors')
      .select()
      .eq('sync_status', status)
      .returns<SyncCursorRow[]>();

    if (error) {
      throw new Error(`Failed to find sync cursors with status ${status}: ${error.message}`, {
        cause: error,
      });
    }

    return (data ?? []).map(toSyncCursor);
  }
}

// Made with Bob

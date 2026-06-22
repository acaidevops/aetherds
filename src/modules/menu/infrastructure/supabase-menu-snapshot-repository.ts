import 'server-only';

import { getServerSupabaseClient, type ServerSupabaseClient } from '@/shared/db';

import type { MenuSnapshot, CreateMenuSnapshotInput } from '../domain/menu-snapshot';
import type { MenuSnapshotRepository } from '../application/ports';

/**
 * Supabase implementation of {@link MenuSnapshotRepository}.
 *
 * Manages immutable, append-only menu snapshots in the `spoton_menu_snapshots`
 * table. Snapshots preserve raw provider menu data for diagnosis and audit
 * (ADR 0006: Menu Ownership). RLS automatically scopes queries by JWT claims
 * for tenant isolation (ADR 0010).
 *
 * The server client uses the service-role identity which bypasses RLS, but
 * queries are still scoped by location_id/restaurant_id from the application
 * layer for defense-in-depth.
 */

/**
 * Database row structure for spoton_menu_snapshots table.
 */
interface MenuSnapshotRow {
  readonly id: string;
  readonly restaurant_id: string;
  readonly location_id: string;
  readonly menu_version: string;
  readonly raw_menu: unknown;
  readonly retrieved_at: string;
  readonly created_at: string;
}

/**
 * Convert database row to domain model.
 * Transforms snake_case to camelCase and ISO timestamp strings to Date objects.
 */
function toMenuSnapshot(row: MenuSnapshotRow): MenuSnapshot {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    locationId: row.location_id,
    menuVersion: row.menu_version,
    rawMenu: row.raw_menu as MenuSnapshot['rawMenu'],
    retrievedAt: new Date(row.retrieved_at),
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseMenuSnapshotRepository implements MenuSnapshotRepository {
  private readonly client: ServerSupabaseClient;

  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  /**
   * Save a new menu snapshot.
   * Snapshots are immutable and append-only - never updated after creation.
   */
  async save(input: CreateMenuSnapshotInput): Promise<MenuSnapshot> {
    const { data, error } = await this.client
      .from('spoton_menu_snapshots')
      .insert({
        restaurant_id: input.restaurantId,
        location_id: input.locationId,
        menu_version: input.menuVersion,
        raw_menu: input.rawMenu,
        retrieved_at: input.retrievedAt.toISOString(),
      })
      .select()
      .single<MenuSnapshotRow>();

    if (error) {
      throw new Error(
        `Failed to save menu snapshot for location ${input.locationId}: ${error.message}`,
        { cause: error }
      );
    }

    if (!data) {
      throw new Error(
        `Failed to save menu snapshot for location ${input.locationId}: no data returned`
      );
    }

    return toMenuSnapshot(data);
  }

  /**
   * Find the most recent snapshot for a location.
   * Orders by retrieved_at descending to get the latest.
   */
  async findLatestByLocation(locationId: string): Promise<MenuSnapshot | null> {
    const { data, error } = await this.client
      .from('spoton_menu_snapshots')
      .select()
      .eq('location_id', locationId)
      .order('retrieved_at', { ascending: false })
      .limit(1)
      .maybeSingle<MenuSnapshotRow>();

    if (error) {
      throw new Error(
        `Failed to find latest snapshot for location ${locationId}: ${error.message}`,
        { cause: error }
      );
    }

    return data ? toMenuSnapshot(data) : null;
  }

  /**
   * Find a snapshot by location and menu version.
   * Used for version-specific lookups and reconciliation.
   */
  async findByVersion(locationId: string, menuVersion: string): Promise<MenuSnapshot | null> {
    const { data, error } = await this.client
      .from('spoton_menu_snapshots')
      .select()
      .eq('location_id', locationId)
      .eq('menu_version', menuVersion)
      .maybeSingle<MenuSnapshotRow>();

    if (error) {
      throw new Error(
        `Failed to find snapshot for location ${locationId} version ${menuVersion}: ${error.message}`,
        { cause: error }
      );
    }

    return data ? toMenuSnapshot(data) : null;
  }

  /**
   * Find all snapshots for a location, ordered by retrieved_at descending.
   * Useful for viewing snapshot history and debugging.
   */
  async findByLocation(locationId: string, limit?: number): Promise<MenuSnapshot[]> {
    let query = this.client
      .from('spoton_menu_snapshots')
      .select()
      .eq('location_id', locationId)
      .order('retrieved_at', { ascending: false });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error } = await query.returns<MenuSnapshotRow[]>();

    if (error) {
      throw new Error(
        `Failed to find snapshots for location ${locationId}: ${error.message}`,
        { cause: error }
      );
    }

    return (data ?? []).map(toMenuSnapshot);
  }
}

// Made with Bob

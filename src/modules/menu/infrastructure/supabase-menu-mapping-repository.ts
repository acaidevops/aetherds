import 'server-only';

import { getServerSupabaseClient, type ServerSupabaseClient } from '@/shared/db';

import type {
  MenuMapping,
  CreateMenuMappingInput,
  UpdateMenuMappingInput,
  EntityType,
  MappingStatus,
} from '../domain/menu-mapping';
import type { MenuMappingRepository } from '../application/ports';

/**
 * Supabase implementation of {@link MenuMappingRepository}.
 *
 * Manages stable AETHER ↔ provider ID mappings in the `menu_mappings` table.
 * These mappings decouple our permanent identifiers from provider IDs, allowing
 * us to track entities across provider changes and detect when mappings break
 * (ADR 0006: Menu Ownership). RLS automatically scopes queries by JWT claims
 * for tenant isolation (ADR 0010).
 *
 * The partial unique index ensures only one active mapping per (location,
 * entity_type, provider_id), while allowing multiple broken/archived mappings
 * for historical tracking.
 */

/**
 * Database row structure for menu_mappings table.
 */
interface MenuMappingRow {
  readonly id: string;
  readonly restaurant_id: string;
  readonly location_id: string;
  readonly entity_type: EntityType;
  readonly aether_id: string;
  readonly provider_id: string;
  readonly provider_name: string;
  readonly mapping_status: MappingStatus;
  readonly last_seen_snapshot_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly broken_at: string | null;
}

/**
 * Convert database row to domain model.
 * Transforms snake_case to camelCase and ISO timestamp strings to Date objects.
 */
function toMenuMapping(row: MenuMappingRow): MenuMapping {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    locationId: row.location_id,
    entityType: row.entity_type,
    aetherId: row.aether_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    mappingStatus: row.mapping_status,
    lastSeenSnapshotId: row.last_seen_snapshot_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    brokenAt: row.broken_at ? new Date(row.broken_at) : null,
  };
}

export class SupabaseMenuMappingRepository implements MenuMappingRepository {
  private readonly client: ServerSupabaseClient;

  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  /**
   * Save a new menu mapping.
   * Creates an active mapping with generated timestamps.
   */
  async save(input: CreateMenuMappingInput): Promise<MenuMapping> {
    const { data, error } = await this.client
      .from('menu_mappings')
      .insert({
        restaurant_id: input.restaurantId,
        location_id: input.locationId,
        entity_type: input.entityType,
        aether_id: input.aetherId,
        provider_id: input.providerId,
        provider_name: input.providerName,
        mapping_status: 'active',
        last_seen_snapshot_id: input.lastSeenSnapshotId ?? null,
      })
      .select()
      .single<MenuMappingRow>();

    if (error) {
      throw new Error(
        `Failed to save menu mapping for ${input.entityType} ${input.providerId}: ${error.message}`,
        { cause: error }
      );
    }

    if (!data) {
      throw new Error(
        `Failed to save menu mapping for ${input.entityType} ${input.providerId}: no data returned`
      );
    }

    return toMenuMapping(data);
  }

  /**
   * Update an existing menu mapping.
   * The updated_at timestamp is automatically managed by the database trigger.
   */
  async update(id: string, input: UpdateMenuMappingInput): Promise<MenuMapping> {
    const updateData: Record<string, unknown> = {};

    if (input.providerName !== undefined) {
      updateData.provider_name = input.providerName;
    }
    if (input.mappingStatus !== undefined) {
      updateData.mapping_status = input.mappingStatus;
    }
    if (input.lastSeenSnapshotId !== undefined) {
      updateData.last_seen_snapshot_id = input.lastSeenSnapshotId;
    }
    if (input.brokenAt !== undefined) {
      updateData.broken_at = input.brokenAt ? input.brokenAt.toISOString() : null;
    }

    const { data, error } = await this.client
      .from('menu_mappings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single<MenuMappingRow>();

    if (error) {
      throw new Error(`Failed to update menu mapping ${id}: ${error.message}`, { cause: error });
    }

    if (!data) {
      throw new Error(`Failed to update menu mapping ${id}: no data returned`);
    }

    return toMenuMapping(data);
  }

  /**
   * Find all active mappings for a location.
   * Optionally filter by entity type.
   */
  async findActiveByLocation(
    locationId: string,
    entityType?: EntityType
  ): Promise<MenuMapping[]> {
    let query = this.client
      .from('menu_mappings')
      .select()
      .eq('location_id', locationId)
      .eq('mapping_status', 'active');

    if (entityType !== undefined) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query.returns<MenuMappingRow[]>();

    if (error) {
      throw new Error(
        `Failed to find active mappings for location ${locationId}: ${error.message}`,
        { cause: error }
      );
    }

    return (data ?? []).map(toMenuMapping);
  }

  /**
   * Find a mapping by provider ID and entity type.
   * Returns the first matching mapping (should be unique for active mappings).
   */
  async findByProviderId(
    locationId: string,
    providerId: string,
    entityType: EntityType
  ): Promise<MenuMapping | null> {
    const { data, error } = await this.client
      .from('menu_mappings')
      .select()
      .eq('location_id', locationId)
      .eq('provider_id', providerId)
      .eq('entity_type', entityType)
      .maybeSingle<MenuMappingRow>();

    if (error) {
      throw new Error(
        `Failed to find mapping for ${entityType} ${providerId}: ${error.message}`,
        { cause: error }
      );
    }

    return data ? toMenuMapping(data) : null;
  }

  /**
   * Find a mapping by AETHER ID.
   * AETHER IDs are globally unique across all mappings.
   */
  async findByAetherId(aetherId: string): Promise<MenuMapping | null> {
    const { data, error } = await this.client
      .from('menu_mappings')
      .select()
      .eq('aether_id', aetherId)
      .maybeSingle<MenuMappingRow>();

    if (error) {
      throw new Error(`Failed to find mapping for AETHER ID ${aetherId}: ${error.message}`, {
        cause: error,
      });
    }

    return data ? toMenuMapping(data) : null;
  }

  /**
   * Mark a mapping as broken (provider ID no longer exists).
   * Sets status to 'broken' and records the broken_at timestamp.
   */
  async markBroken(id: string): Promise<MenuMapping> {
    return this.update(id, {
      mappingStatus: 'broken',
      brokenAt: new Date(),
    });
  }

  /**
   * Archive a mapping (intentionally retired).
   * Sets status to 'archived' and clears the broken_at timestamp.
   */
  async archive(id: string): Promise<MenuMapping> {
    return this.update(id, {
      mappingStatus: 'archived',
      brokenAt: null,
    });
  }

  /**
   * Find all broken mappings for a location.
   * Optionally filter by entity type.
   */
  async findBrokenByLocation(
    locationId: string,
    entityType?: EntityType
  ): Promise<MenuMapping[]> {
    let query = this.client
      .from('menu_mappings')
      .select()
      .eq('location_id', locationId)
      .eq('mapping_status', 'broken');

    if (entityType !== undefined) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query.returns<MenuMappingRow[]>();

    if (error) {
      throw new Error(
        `Failed to find broken mappings for location ${locationId}: ${error.message}`,
        { cause: error }
      );
    }

    return (data ?? []).map(toMenuMapping);
  }
}

// Made with Bob

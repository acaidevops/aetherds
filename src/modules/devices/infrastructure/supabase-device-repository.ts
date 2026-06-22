import 'server-only';

import { getServerSupabaseClient, type ServerSupabaseClient } from '@/shared/db';
import type { TenantScope } from '@/shared/auth';

import type { Device, DeviceStatus } from '../domain/device';
import type { DeviceCredential } from '../domain/device-credential';
import type { DeviceCredentialRepository, DeviceRepository, NewDevice } from '../application/ports';

/**
 * Supabase implementations of the device + credential repositories (B2).
 *
 * Both use the service-role client (RLS-bypass): manager commands write here
 * after the application layer has authorized them, and the device-auth path
 * reads credentials that are intentionally unreadable to any client role. Scope
 * is always passed explicitly; RLS remains the defense-in-depth backstop.
 */
interface DeviceRow {
  readonly id: string;
  readonly restaurant_id: string;
  readonly location_id: string;
  readonly default_table_id: string | null;
  readonly label: string | null;
  readonly status: DeviceStatus;
  readonly provisioned_by: string | null;
}

const DEVICE_COLS =
  'id, restaurant_id, location_id, default_table_id, label, status, provisioned_by';

function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    locationId: row.location_id,
    defaultTableId: row.default_table_id,
    label: row.label,
    status: row.status,
    provisionedBy: row.provisioned_by,
  };
}

export class SupabaseDeviceRepository implements DeviceRepository {
  private readonly client: ServerSupabaseClient;
  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  async insert(input: NewDevice): Promise<Device> {
    const { data, error } = await this.client
      .from('devices')
      .insert({
        restaurant_id: input.restaurantId,
        location_id: input.locationId,
        default_table_id: input.defaultTableId,
        label: input.label,
        provisioned_by: input.provisionedBy,
      })
      .select(DEVICE_COLS)
      .single<DeviceRow>();
    if (error || !data) throw new Error(`Failed to insert device: ${error?.message}`);
    return toDevice(data);
  }

  async findInScope(deviceId: string, scope: TenantScope): Promise<Device | null> {
    const { data, error } = await this.client
      .from('devices')
      .select(DEVICE_COLS)
      .eq('id', deviceId)
      .eq('restaurant_id', scope.restaurantId)
      .eq('location_id', scope.locationId)
      .maybeSingle<DeviceRow>();
    if (error) throw new Error(`Failed to load device: ${error.message}`);
    return data ? toDevice(data) : null;
  }

  async findById(deviceId: string): Promise<Device | null> {
    const { data, error } = await this.client
      .from('devices')
      .select(DEVICE_COLS)
      .eq('id', deviceId)
      .maybeSingle<DeviceRow>();
    if (error) throw new Error(`Failed to load device: ${error.message}`);
    return data ? toDevice(data) : null;
  }

  async setStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    const { error } = await this.client.from('devices').update({ status }).eq('id', deviceId);
    if (error) throw new Error(`Failed to update device status: ${error.message}`);
  }

  async setDefaultTable(deviceId: string, tableId: string): Promise<void> {
    const { error } = await this.client
      .from('devices')
      .update({ default_table_id: tableId })
      .eq('id', deviceId);
    if (error) throw new Error(`Failed to update device table: ${error.message}`);
  }
}

interface CredentialRow {
  readonly id: string;
  readonly device_id: string;
  readonly token_hash: string;
  readonly status: 'active' | 'revoked';
}

export class SupabaseDeviceCredentialRepository implements DeviceCredentialRepository {
  private readonly client: ServerSupabaseClient;
  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  async insert(input: { deviceId: string; tokenHash: string }): Promise<DeviceCredential> {
    const { data, error } = await this.client
      .from('device_credentials')
      .insert({ device_id: input.deviceId, token_hash: input.tokenHash })
      .select('id, device_id, token_hash, status')
      .single<CredentialRow>();
    if (error || !data) throw new Error(`Failed to insert credential: ${error?.message}`);
    return {
      id: data.id,
      deviceId: data.device_id,
      tokenHash: data.token_hash,
      status: data.status,
    };
  }

  async findActiveByHash(tokenHash: string): Promise<DeviceCredential | null> {
    const { data, error } = await this.client
      .from('device_credentials')
      .select('id, device_id, token_hash, status')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .maybeSingle<CredentialRow>();
    if (error) throw new Error(`Failed to load credential: ${error.message}`);
    return data
      ? { id: data.id, deviceId: data.device_id, tokenHash: data.token_hash, status: data.status }
      : null;
  }

  async revokeAllForDevice(deviceId: string): Promise<void> {
    const { error } = await this.client
      .from('device_credentials')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('status', 'active');
    if (error) throw new Error(`Failed to revoke credentials: ${error.message}`);
  }
}

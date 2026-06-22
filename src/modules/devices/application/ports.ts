import type { TenantScope } from '@/shared/auth';
import type { AuditEventInput } from '@/modules/audit';

import type { Device, DeviceStatus } from '../domain/device';
import type { DeviceCredential } from '../domain/device-credential';

/**
 * Persistence ports for the devices module (ADR 0004). The Supabase
 * implementations use the service-role client; tenant scope is always passed
 * explicitly (never widened from client input) and RLS is the backstop.
 */
export interface NewDevice {
  readonly restaurantId: string;
  readonly locationId: string;
  readonly defaultTableId: string | null;
  readonly label: string | null;
  readonly provisionedBy: string | null;
}

export interface DeviceRepository {
  insert(device: NewDevice): Promise<Device>;
  /** Find a device within an exact tenant scope, or null (manager commands). */
  findInScope(deviceId: string, scope: TenantScope): Promise<Device | null>;
  /** Find a device by id with no scope — the device-auth path derives scope
   * FROM the device, so it cannot pre-supply one (service-role only). */
  findById(deviceId: string): Promise<Device | null>;
  setStatus(deviceId: string, status: DeviceStatus): Promise<void>;
  setDefaultTable(deviceId: string, tableId: string): Promise<void>;
}

export interface DeviceCredentialRepository {
  insert(input: {
    readonly deviceId: string;
    readonly tokenHash: string;
  }): Promise<DeviceCredential>;
  /** The active credential whose hash matches, or null. Used for auth. */
  findActiveByHash(tokenHash: string): Promise<DeviceCredential | null>;
  /** Revoke all active credentials for a device (revocation/reassignment). */
  revokeAllForDevice(deviceId: string): Promise<void>;
}

/** Audit recorder port — defaults to the A4 recordAuditEvent at the composition
 * root; tests inject a fake so the command stays free of a request context. */
export type AuditRecorder = (input: AuditEventInput) => Promise<unknown>;

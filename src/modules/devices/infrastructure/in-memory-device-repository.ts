import { randomUUID } from 'node:crypto';

import type { TenantScope } from '@/shared/auth';

import type { Device, DeviceStatus } from '../domain/device';
import type { DeviceCredential } from '../domain/device-credential';
import type { DeviceCredentialRepository, DeviceRepository, NewDevice } from '../application/ports';

/** Deterministic in-memory device + credential stores for unit tests/dev. */
export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly devices = new Map<string, Device>();

  constructor(seed: readonly Device[] = []) {
    for (const d of seed) this.devices.set(d.id, d);
  }

  async insert(input: NewDevice): Promise<Device> {
    const device: Device = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      locationId: input.locationId,
      defaultTableId: input.defaultTableId,
      label: input.label,
      status: 'active',
      provisionedBy: input.provisionedBy,
    };
    this.devices.set(device.id, device);
    return device;
  }

  async findInScope(deviceId: string, scope: TenantScope): Promise<Device | null> {
    const d = this.devices.get(deviceId);
    if (!d || d.restaurantId !== scope.restaurantId || d.locationId !== scope.locationId) {
      return null;
    }
    return d;
  }

  async findById(deviceId: string): Promise<Device | null> {
    return this.devices.get(deviceId) ?? null;
  }

  async setStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    const d = this.devices.get(deviceId);
    if (d) this.devices.set(deviceId, { ...d, status });
  }

  async setDefaultTable(deviceId: string, tableId: string): Promise<void> {
    const d = this.devices.get(deviceId);
    if (d) this.devices.set(deviceId, { ...d, defaultTableId: tableId });
  }
}

export class InMemoryDeviceCredentialRepository implements DeviceCredentialRepository {
  private readonly credentials: DeviceCredential[] = [];

  async insert(input: { deviceId: string; tokenHash: string }): Promise<DeviceCredential> {
    const credential: DeviceCredential = {
      id: randomUUID(),
      deviceId: input.deviceId,
      tokenHash: input.tokenHash,
      status: 'active',
    };
    this.credentials.push(credential);
    return credential;
  }

  async findActiveByHash(tokenHash: string): Promise<DeviceCredential | null> {
    return this.credentials.find((c) => c.tokenHash === tokenHash && c.status === 'active') ?? null;
  }

  async revokeAllForDevice(deviceId: string): Promise<void> {
    for (let i = 0; i < this.credentials.length; i += 1) {
      const c = this.credentials[i];
      if (c && c.deviceId === deviceId && c.status === 'active') {
        this.credentials[i] = { ...c, status: 'revoked' };
      }
    }
  }
}

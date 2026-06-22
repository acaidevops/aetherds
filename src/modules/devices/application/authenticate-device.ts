import 'server-only';

import { AuthScopeDeniedError } from '@/shared/auth';

import { canAuthenticate, DeviceNotActiveError } from '../domain/device';
import { hashToken } from '../domain/device-credential';
import type { DeviceCredentialRepository, DeviceRepository } from './ports';

/**
 * Authenticate a device by its presented credential token (B2).
 *
 * The token is hashed and matched against ACTIVE credentials; the owning device
 * must be `active` (a quarantined/revoked device is rejected). Scope is derived
 * FROM the device, never from client input (ADR 0010). Returns a
 * {@link DeviceIdentity} — devices are NOT staff principals (ADR 0008: device
 * identity is separate from user identity), so this is a distinct capability,
 * not a {@link Principal} with a staff role.
 */
export interface DeviceIdentity {
  readonly deviceId: string;
  readonly restaurantId: string;
  readonly locationId: string;
  readonly defaultTableId: string | null;
}

export interface AuthenticateDeviceDeps {
  readonly devices: DeviceRepository;
  readonly credentials: DeviceCredentialRepository;
}

export async function authenticateDevice(
  token: string,
  deps: AuthenticateDeviceDeps,
): Promise<DeviceIdentity> {
  const credential = await deps.credentials.findActiveByHash(hashToken(token));
  if (!credential) {
    throw new AuthScopeDeniedError('Unknown or revoked device credential.');
  }

  const device = await deps.devices.findById(credential.deviceId);
  if (!device) {
    throw new AuthScopeDeniedError('Device not found for credential.');
  }
  if (!canAuthenticate(device)) {
    // Maps to the stable DEVICE_QUARANTINED API error.
    throw new DeviceNotActiveError(device.status);
  }

  return {
    deviceId: device.id,
    restaurantId: device.restaurantId,
    locationId: device.locationId,
    defaultTableId: device.defaultTableId,
  };
}

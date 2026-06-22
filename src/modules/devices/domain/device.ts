/**
 * Devices domain: a revocable, table-bound tablet identity (ADR 0008).
 *
 * A device is NOT a user account. It is provisioned by a manager to one
 * location and a default table, can be reassigned (which invalidates its prior
 * credential), quarantined (temporarily disabled), or revoked (permanently).
 * Only an `active` device may authenticate.
 */

export type DeviceStatus = 'active' | 'quarantined' | 'revoked';

export interface Device {
  readonly id: string;
  readonly restaurantId: string;
  readonly locationId: string;
  readonly defaultTableId: string | null;
  readonly label: string | null;
  readonly status: DeviceStatus;
  /** User id of the manager who provisioned it. */
  readonly provisionedBy: string | null;
}

/** Only an active device may present a credential and obtain a session. */
export function canAuthenticate(device: Pick<Device, 'status'>): boolean {
  return device.status === 'active';
}

/** Thrown when a quarantined/revoked device attempts to authenticate. */
export class DeviceNotActiveError extends Error {
  readonly status: DeviceStatus;
  constructor(status: DeviceStatus) {
    super(`Device is not active (status: ${status}).`);
    this.name = 'DeviceNotActiveError';
    this.status = status;
  }
}

export class DeviceNotFoundError extends Error {
  constructor() {
    super('Device not found in the requested scope.');
    this.name = 'DeviceNotFoundError';
  }
}

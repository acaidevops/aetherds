import 'server-only';

import type { Principal, TenantScope } from '@/shared/auth';
import { authorizeStaffCommand } from '@/modules/identity';
import { recordAuditEvent } from '@/modules/audit';

import type { Device } from '../domain/device';
import { generateCredential } from '../domain/device-credential';
import type { AuditRecorder, DeviceCredentialRepository, DeviceRepository } from './ports';

/**
 * Provision a device — the one-time manager setup flow (B2).
 *
 * Manager/owner only, behind step-up reauthentication (`device.provision`). The
 * plaintext credential token is returned ONCE for the manager to enroll the
 * tablet; only its hash is persisted. The action is audited (A4).
 */
export interface ProvisionDeviceInput {
  readonly principal: Principal;
  readonly scope: TenantScope;
  readonly defaultTableId?: string | null;
  readonly label?: string | null;
  readonly reauthenticatedAt?: Date;
  readonly now?: Date;
}

export interface ProvisionDeviceDeps {
  readonly devices: DeviceRepository;
  readonly credentials: DeviceCredentialRepository;
  readonly recordAudit?: AuditRecorder;
}

export interface ProvisionDeviceResult {
  readonly device: Device;
  /** One-time enrollment token. Show once; never stored. */
  readonly token: string;
}

export async function provisionDevice(
  input: ProvisionDeviceInput,
  deps: ProvisionDeviceDeps,
): Promise<ProvisionDeviceResult> {
  authorizeStaffCommand({
    principal: input.principal,
    scope: input.scope,
    permittedRoles: ['owner', 'manager'],
    command: 'device.provision',
    reauthenticatedAt: input.reauthenticatedAt,
    now: input.now,
  });

  const device = await deps.devices.insert({
    restaurantId: input.scope.restaurantId,
    locationId: input.scope.locationId,
    defaultTableId: input.defaultTableId ?? null,
    label: input.label ?? null,
    provisionedBy: input.principal.context.kind === 'staff' ? input.principal.context.userId : null,
  });

  const credential = generateCredential();
  await deps.credentials.insert({ deviceId: device.id, tokenHash: credential.tokenHash });

  const audit = deps.recordAudit ?? recordAuditEvent;
  await audit({
    action: 'device.provision',
    outcome: 'success',
    after: { deviceId: device.id, defaultTableId: device.defaultTableId },
  });

  return { device, token: credential.token };
}

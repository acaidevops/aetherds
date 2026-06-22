import 'server-only';

import type { Principal, TenantScope } from '@/shared/auth';
import { authorizeStaffCommand } from '@/modules/identity';
import { recordAuditEvent } from '@/modules/audit';

import { type Device, DeviceNotFoundError } from '../domain/device';
import { generateCredential } from '../domain/device-credential';
import type { AuditRecorder, DeviceCredentialRepository, DeviceRepository } from './ports';

/**
 * Device lifecycle commands after provisioning (B2): revoke, quarantine, and
 * reassign. All are manager/owner only and audited; revoke and reassign are
 * step-up protected because they change or destroy the device's capability.
 */
export interface DeviceCommandInput {
  readonly principal: Principal;
  readonly scope: TenantScope;
  readonly deviceId: string;
  readonly reason?: string | null;
  readonly reauthenticatedAt?: Date;
  readonly now?: Date;
}

export interface DeviceCommandDeps {
  readonly devices: DeviceRepository;
  readonly credentials: DeviceCredentialRepository;
  readonly recordAudit?: AuditRecorder;
}

async function loadInScope(input: DeviceCommandInput, deps: DeviceCommandDeps): Promise<Device> {
  const device = await deps.devices.findInScope(input.deviceId, input.scope);
  if (!device) throw new DeviceNotFoundError();
  return device;
}

/**
 * Permanently revoke a device: status → revoked and ALL credentials revoked, so
 * the tablet can never authenticate again.
 */
export async function revokeDevice(
  input: DeviceCommandInput,
  deps: DeviceCommandDeps,
): Promise<Device> {
  authorizeStaffCommand({
    principal: input.principal,
    scope: input.scope,
    permittedRoles: ['owner', 'manager'],
    command: 'device.revoke',
    reauthenticatedAt: input.reauthenticatedAt,
    now: input.now,
  });

  const device = await loadInScope(input, deps);
  await deps.devices.setStatus(device.id, 'revoked');
  await deps.credentials.revokeAllForDevice(device.id);

  const audit = deps.recordAudit ?? recordAuditEvent;
  await audit({
    action: 'device.revoke',
    outcome: 'success',
    reason: input.reason ?? null,
    before: { status: device.status },
    after: { status: 'revoked' },
  });

  return { ...device, status: 'revoked' };
}

/**
 * Quarantine a device: status → quarantined so it cannot authenticate, without
 * destroying its credential. Not step-up protected — quarantine is an urgent
 * containment control that must stay fast — but still manager/owner only.
 */
export async function quarantineDevice(
  input: DeviceCommandInput,
  deps: DeviceCommandDeps,
): Promise<Device> {
  authorizeStaffCommand({
    principal: input.principal,
    scope: input.scope,
    permittedRoles: ['owner', 'manager'],
    command: 'device.quarantine',
    reauthenticatedAt: input.reauthenticatedAt,
    now: input.now,
  });

  const device = await loadInScope(input, deps);
  await deps.devices.setStatus(device.id, 'quarantined');

  const audit = deps.recordAudit ?? recordAuditEvent;
  await audit({
    action: 'device.quarantine',
    outcome: 'success',
    reason: input.reason ?? null,
    before: { status: device.status },
    after: { status: 'quarantined' },
  });

  return { ...device, status: 'quarantined' };
}

export interface ReassignDeviceInput extends DeviceCommandInput {
  readonly newTableId: string;
}

export interface ReassignDeviceResult {
  readonly device: Device;
  /** Fresh one-time enrollment token; the prior credential is now revoked. */
  readonly token: string;
}

/**
 * Reassign a device to a new default table. Invalidates the prior capability:
 * all existing credentials are revoked and a new one is issued (returned once).
 * Step-up protected (`device.reassign`).
 */
export async function reassignDevice(
  input: ReassignDeviceInput,
  deps: DeviceCommandDeps,
): Promise<ReassignDeviceResult> {
  authorizeStaffCommand({
    principal: input.principal,
    scope: input.scope,
    permittedRoles: ['owner', 'manager'],
    command: 'device.reassign',
    reauthenticatedAt: input.reauthenticatedAt,
    now: input.now,
  });

  const device = await loadInScope(input, deps);

  // Invalidate the prior capability BEFORE issuing the new one.
  await deps.credentials.revokeAllForDevice(device.id);
  await deps.devices.setDefaultTable(device.id, input.newTableId);

  const credential = generateCredential();
  await deps.credentials.insert({ deviceId: device.id, tokenHash: credential.tokenHash });

  const audit = deps.recordAudit ?? recordAuditEvent;
  await audit({
    action: 'device.reassign',
    outcome: 'success',
    reason: input.reason ?? null,
    before: { defaultTableId: device.defaultTableId },
    after: { defaultTableId: input.newTableId },
  });

  return { device: { ...device, defaultTableId: input.newTableId }, token: credential.token };
}

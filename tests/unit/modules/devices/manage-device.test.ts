import { describe, expect, it, vi } from 'vitest';

import { AuthScopeDeniedError, type Principal } from '@/shared/auth';
import { ReauthenticationRequiredError } from '@/modules/identity';
import {
  authenticateDevice,
  DeviceNotActiveError,
  DeviceNotFoundError,
  InMemoryDeviceCredentialRepository,
  InMemoryDeviceRepository,
  provisionDevice,
  quarantineDevice,
  reassignDevice,
  revokeDevice,
} from '@/modules/devices';

const SCOPE = { restaurantId: 'r1', locationId: 'l1' } as const;
const NOW = new Date('2026-06-22T12:00:00Z');
const FRESH = new Date(NOW.getTime() - 30_000);

function manager(): Principal {
  return { context: { kind: 'staff', userId: 'mgr1' }, role: 'manager', scope: SCOPE };
}

function setup() {
  const devices = new InMemoryDeviceRepository();
  const credentials = new InMemoryDeviceCredentialRepository();
  const recordAudit = vi.fn().mockResolvedValue(undefined);
  return { devices, credentials, recordAudit };
}

async function provision(d: ReturnType<typeof setup>, tableId = 't1') {
  return provisionDevice(
    {
      principal: manager(),
      scope: SCOPE,
      defaultTableId: tableId,
      reauthenticatedAt: FRESH,
      now: NOW,
    },
    d,
  );
}

describe('device lifecycle', () => {
  it('authenticates a provisioned device and derives its scope', async () => {
    const d = setup();
    const { device, token } = await provision(d);
    const identity = await authenticateDevice(token, d);
    expect(identity).toEqual({
      deviceId: device.id,
      restaurantId: 'r1',
      locationId: 'l1',
      defaultTableId: 't1',
    });
  });

  it('revoke disables the device and invalidates its credential', async () => {
    const d = setup();
    const { device, token } = await provision(d);
    const revoked = await revokeDevice(
      {
        principal: manager(),
        scope: SCOPE,
        deviceId: device.id,
        reauthenticatedAt: FRESH,
        now: NOW,
      },
      d,
    );
    expect(revoked.status).toBe('revoked');
    await expect(authenticateDevice(token, d)).rejects.toBeInstanceOf(AuthScopeDeniedError);
    expect(d.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'device.revoke', outcome: 'success' }),
    );
  });

  it('quarantine blocks authentication without step-up, and is audited', async () => {
    const d = setup();
    const { device, token } = await provision(d);
    // No reauthenticatedAt supplied — quarantine is not step-up protected.
    const q = await quarantineDevice(
      { principal: manager(), scope: SCOPE, deviceId: device.id, now: NOW },
      d,
    );
    expect(q.status).toBe('quarantined');
    await expect(authenticateDevice(token, d)).rejects.toBeInstanceOf(DeviceNotActiveError);
    expect(d.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'device.quarantine' }),
    );
  });

  it('reassign invalidates the prior capability and issues a fresh token', async () => {
    const d = setup();
    const { device, token: oldToken } = await provision(d, 't1');

    const result = await reassignDevice(
      {
        principal: manager(),
        scope: SCOPE,
        deviceId: device.id,
        newTableId: 't2',
        reauthenticatedAt: FRESH,
        now: NOW,
      },
      d,
    );

    expect(result.device.defaultTableId).toBe('t2');
    // Old token no longer works; the new one binds to the new table.
    await expect(authenticateDevice(oldToken, d)).rejects.toBeInstanceOf(AuthScopeDeniedError);
    const identity = await authenticateDevice(result.token, d);
    expect(identity.defaultTableId).toBe('t2');
  });

  it('reassign requires step-up reauthentication', async () => {
    const d = setup();
    const { device } = await provision(d);
    await expect(
      reassignDevice(
        { principal: manager(), scope: SCOPE, deviceId: device.id, newTableId: 't2', now: NOW },
        d,
      ),
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);
  });

  it('rejects commands on a device outside the caller’s scope', async () => {
    const d = setup();
    const { device } = await provision(d);
    await expect(
      revokeDevice(
        {
          principal: {
            context: { kind: 'staff', userId: 'm2' },
            role: 'manager',
            scope: { restaurantId: 'r1', locationId: 'OTHER' },
          },
          scope: { restaurantId: 'r1', locationId: 'OTHER' },
          deviceId: device.id,
          reauthenticatedAt: FRESH,
          now: NOW,
        },
        d,
      ),
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
  });
});

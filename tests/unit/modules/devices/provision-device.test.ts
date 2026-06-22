import { describe, expect, it, vi } from 'vitest';

import type { Principal } from '@/shared/auth';
import { ReauthenticationRequiredError, RoleNotPermittedError } from '@/modules/identity';
import {
  hashToken,
  InMemoryDeviceCredentialRepository,
  InMemoryDeviceRepository,
  provisionDevice,
  tokenMatchesHash,
} from '@/modules/devices';

const SCOPE = { restaurantId: 'r1', locationId: 'l1' } as const;
const NOW = new Date('2026-06-22T12:00:00Z');

function principal(role: Principal['role'] = 'manager', userId = 'mgr1'): Principal {
  return { context: { kind: 'staff', userId }, role, scope: SCOPE };
}

function deps() {
  const devices = new InMemoryDeviceRepository();
  const credentials = new InMemoryDeviceCredentialRepository();
  const recordAudit = vi.fn().mockResolvedValue(undefined);
  return { devices, credentials, recordAudit };
}

describe('provisionDevice', () => {
  it('provisions an active device bound to a table and returns a one-time token', async () => {
    const d = deps();
    const result = await provisionDevice(
      {
        principal: principal(),
        scope: SCOPE,
        defaultTableId: 't1',
        label: 'Table 1 iPad',
        reauthenticatedAt: new Date(NOW.getTime() - 30_000),
        now: NOW,
      },
      d,
    );

    expect(result.device.status).toBe('active');
    expect(result.device.defaultTableId).toBe('t1');
    expect(result.device.provisionedBy).toBe('mgr1');
    expect(result.token.length).toBeGreaterThan(0);

    // The returned token authenticates against the stored hashed credential.
    const cred = await d.credentials.findActiveByHash(hashToken(result.token));
    expect(cred).not.toBeNull();
    expect(cred && tokenMatchesHash(result.token, cred.tokenHash)).toBe(true);

    expect(d.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'device.provision', outcome: 'success' }),
    );
  });

  it('denies a non-manager role', async () => {
    await expect(
      provisionDevice(
        { principal: principal('server'), scope: SCOPE, reauthenticatedAt: NOW, now: NOW },
        deps(),
      ),
    ).rejects.toBeInstanceOf(RoleNotPermittedError);
  });

  it('requires step-up reauthentication (privileged command)', async () => {
    await expect(
      provisionDevice({ principal: principal(), scope: SCOPE, now: NOW }, deps()),
    ).rejects.toBeInstanceOf(ReauthenticationRequiredError);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { getSystemHealth } from '@/modules/platform-operations';
import { aggregateStatus } from '@/modules/platform-operations/domain/system-health';

describe('aggregateStatus', () => {
  it('is ok for an empty or all-ok check set', () => {
    expect(aggregateStatus([])).toBe('ok');
    expect(
      aggregateStatus([
        { name: 'a', status: 'ok' },
        { name: 'b', status: 'ok' },
      ]),
    ).toBe('ok');
  });

  it('is degraded when any check is degraded', () => {
    expect(
      aggregateStatus([
        { name: 'a', status: 'ok' },
        { name: 'b', status: 'degraded' },
      ]),
    ).toBe('degraded');
  });

  it('down beats degraded', () => {
    expect(
      aggregateStatus([
        { name: 'a', status: 'degraded' },
        { name: 'b', status: 'down' },
      ]),
    ).toBe('down');
  });
});

describe('getSystemHealth', () => {
  it('returns a baseline ok projection derived from config', async () => {
    const health = await getSystemHealth({ appEnv: 'production', appVersion: '1.0.0' });

    expect(health.status).toBe('ok');
    expect(health.appEnv).toBe('production');
    expect(health.appVersion).toBe('1.0.0');
    expect(health.checks.app?.status).toBe('ok');
    expect(Number.isNaN(new Date(health.checkedAt).getTime())).toBe(false);
  });

  it('includes an optional database ping and reflects its status', async () => {
    const pingDatabase = vi.fn().mockResolvedValue({
      name: 'database',
      status: 'degraded',
      detail: 'pool pressure',
    });

    const health = await getSystemHealth({
      appEnv: 'development',
      appVersion: '0.0.0',
      pingDatabase,
    });

    expect(pingDatabase).toHaveBeenCalledTimes(1);
    expect(health.status).toBe('degraded');
    expect(health.checks.database?.status).toBe('degraded');
  });
});

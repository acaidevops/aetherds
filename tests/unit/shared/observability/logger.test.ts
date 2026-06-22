import { describe, expect, it, vi } from 'vitest';

import { createLogger, withRequestContext } from '@/shared/observability';

const VALID = 'corr_00000000-0000-4000-8000-000000000000';

describe('logger', () => {
  // tests/setup.ts pins LOG_LEVEL to 'warn'.

  it('auto-attaches correlation id + scope from the request context and redacts', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await withRequestContext(
      { correlationId: VALID, actor: { type: 'service', id: 'x' }, restaurantId: 'r1' },
      async () => {
        createLogger('test').error('boom', { password: 'secret' });
      },
    );

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls.at(0)?.[0] as string);
    expect(payload.message).toBe('boom');
    expect(payload.correlationId).toBe(VALID);
    expect(payload.restaurantId).toBe('r1');
    expect(payload.scope).toBe('test');
    expect(payload.password).toBe('[REDACTED]');
    spy.mockRestore();
  });

  it('respects the configured level (info is dropped when LOG_LEVEL=warn)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await withRequestContext(
      { correlationId: VALID, actor: { type: 'service', id: 'x' } },
      async () => {
        createLogger().info('dropped');
      },
    );

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

import { describe, expect, it } from 'vitest';

import { getCorrelationId, getRequestContext, withRequestContext } from '@/shared/observability';

const VALID = 'corr_00000000-0000-4000-8000-000000000000';

describe('request context', () => {
  it('propagates correlation id and scope across an async chain', async () => {
    await withRequestContext(
      { correlationId: VALID, actor: { type: 'service', id: 'x' }, restaurantId: 'r1' },
      async () => {
        // Hops across a microtask boundary, like a real handler awaiting work.
        await Promise.resolve();
        expect(getCorrelationId()).toBe(VALID);
        const ctx = getRequestContext();
        expect(ctx?.restaurantId).toBe('r1');
        expect(ctx?.actor).toEqual({ type: 'service', id: 'x' });
      },
    );
  });

  it('clears the context once the callback returns', async () => {
    await withRequestContext(
      { correlationId: VALID, actor: { type: 'service', id: 'x' } },
      async () => {
        expect(getCorrelationId()).toBe(VALID);
      },
    );
    expect(getCorrelationId()).toBeUndefined();
    expect(getRequestContext()).toBeUndefined();
  });

  it('throws on an invalid correlation id rather than propagating it', () => {
    expect(() =>
      withRequestContext(
        { correlationId: 'not-a-corr-id', actor: { type: 'service', id: 'x' } },
        () => undefined,
      ),
    ).toThrow(/invalid correlation/i);
  });
});

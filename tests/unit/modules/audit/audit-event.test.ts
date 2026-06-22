import { describe, expect, it } from 'vitest';

import { createAuditEvent } from '@/modules/audit';

const VALID = 'corr_00000000-0000-4000-8000-000000000000';
const actor = { type: 'service' as const, id: 's1' };

describe('createAuditEvent', () => {
  it('constructs a complete event with minted id, timestamp, and references', () => {
    const event = createAuditEvent({
      actor,
      correlationId: VALID,
      action: 'order.approved',
      outcome: 'success',
      restaurantId: 'r1',
      before: { version: 1 },
      after: { version: 2 },
    });

    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.action).toBe('order.approved');
    expect(event.outcome).toBe('success');
    expect(event.restaurantId).toBe('r1');
    expect(event.before).toEqual({ version: 1 });
    expect(event.after).toEqual({ version: 2 });
    expect(event.reason).toBeNull();
  });

  it('is frozen (immutable value object)', () => {
    const event = createAuditEvent({
      actor,
      correlationId: VALID,
      action: 'a',
      outcome: 'success',
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('requires action, correlationId, and a complete actor', () => {
    expect(() =>
      createAuditEvent({ actor, correlationId: VALID, action: '', outcome: 'success' }),
    ).toThrow(/action/i);
    expect(() =>
      createAuditEvent({ actor, correlationId: '', action: 'a', outcome: 'success' }),
    ).toThrow(/correlation/i);
    expect(() =>
      createAuditEvent({
        actor: { type: 'service', id: '' },
        correlationId: VALID,
        action: 'a',
        outcome: 'success',
      }),
    ).toThrow(/actor/i);
  });
});

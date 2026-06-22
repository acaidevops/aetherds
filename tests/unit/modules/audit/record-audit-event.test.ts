import { describe, expect, it } from 'vitest';

import { recordAuditEvent, type AuditEvent, type AuditEventRepository } from '@/modules/audit';

const VALID = 'corr_00000000-0000-4000-8000-000000000000';

function fakeRepo(sink: AuditEvent[]): AuditEventRepository {
  return {
    async insert(event) {
      sink.push(event);
      return event;
    },
  };
}

describe('recordAuditEvent', () => {
  it('derives correlation/scope/actor from the request context (never from input)', async () => {
    const inserted: AuditEvent[] = [];
    const event = await recordAuditEvent(
      { action: 'order.approved', outcome: 'success' },
      {
        repo: fakeRepo(inserted),
        context: {
          correlationId: VALID,
          actor: { type: 'user', id: 'u1' },
          restaurantId: 'r1',
          locationId: 'l1',
        },
      },
    );

    expect(event.action).toBe('order.approved');
    expect(event.correlationId).toBe(VALID);
    expect(event.restaurantId).toBe('r1');
    expect(event.locationId).toBe('l1');
    expect(event.actor).toEqual({ type: 'user', id: 'u1' });
    expect(inserted).toHaveLength(1);
    expect(inserted.at(0)?.id).toBe(event.id);
  });

  it('exposes no scope field on the input — client cannot forge tenant scope', async () => {
    const inserted: AuditEvent[] = [];
    const event = await recordAuditEvent(
      { action: 'x', outcome: 'success' },
      {
        repo: fakeRepo(inserted),
        context: { correlationId: VALID, actor: { type: 'service', id: 's' } },
      },
    );
    expect(event.restaurantId).toBeNull();
  });

  it('throws when no request context is available', async () => {
    await expect(recordAuditEvent({ action: 'x', outcome: 'success' })).rejects.toThrow(
      /request context/i,
    );
  });
});

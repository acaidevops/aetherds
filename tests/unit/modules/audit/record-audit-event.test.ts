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

  it('redacts token-shaped secrets in reason and before/after before persisting', async () => {
    const inserted: AuditEvent[] = [];
    const event = await recordAuditEvent(
      {
        action: 'order.approved',
        outcome: 'success',
        reason: 'Bearer abc.def.ghi',
        before: { token: 'secret-value', itemId: 'i1' },
        after: { state: 'approved' },
      },
      {
        repo: fakeRepo(inserted),
        context: { correlationId: VALID, actor: { type: 'user', id: 'u1' } },
      },
    );

    expect(event.reason).toBe('[REDACTED]');
    expect(event.before).toEqual({ token: '[REDACTED]', itemId: 'i1' });
    expect(event.after).toEqual({ state: 'approved' });
  });

  it('scrubs secrets EMBEDDED mid-string in reason and nested before/after values', async () => {
    const inserted: AuditEvent[] = [];
    const event = await recordAuditEvent(
      {
        action: 'order.approved',
        outcome: 'failure',
        reason: 'retry after auth failure; token=sk_live_abc123 returned 401',
        before: { note: 'see jwt eyJhbGciOi.JzdWIiOiI.signature for context' },
      },
      {
        repo: fakeRepo(inserted),
        context: { correlationId: VALID, actor: { type: 'service', id: 's' } },
      },
    );

    expect(event.reason).toContain('[REDACTED]');
    expect(event.reason).not.toContain('sk_live_abc123');
    expect((event.before as { note: string }).note).toContain('[REDACTED]');
    expect((event.before as { note: string }).note).not.toContain('eyJhbGciOi');
  });

  it('bounds an over-long reason so the immutable trail cannot be flooded', async () => {
    const inserted: AuditEvent[] = [];
    const event = await recordAuditEvent(
      { action: 'x', outcome: 'success', reason: 'a'.repeat(2000) },
      {
        repo: fakeRepo(inserted),
        context: { correlationId: VALID, actor: { type: 'service', id: 's' } },
      },
    );
    expect(event.reason?.length).toBe(500);
  });
});

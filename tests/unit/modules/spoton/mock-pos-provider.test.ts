import { describe, expect, it } from 'vitest';

import type { OrderSubmission } from '@/modules/spoton';
import { createMockPosProvider } from '@/modules/spoton/infrastructure/mock-pos-provider';

const LOCATION = { locationId: 'loc_mock' } as const;
const TABLE = { tableId: 'tbl_1' } as const;

function submission(key: string, overrides: Partial<OrderSubmission> = {}): OrderSubmission {
  return {
    idempotencyKey: key,
    location: LOCATION,
    table: TABLE,
    employee: { employeeId: 'emp_1' },
    menuVersion: 'mock-menu-v1',
    lines: [
      {
        itemId: 'item_calamari',
        name: 'Crispy Calamari',
        quantity: 1,
        unitPrice: { amountMinor: 1400, currency: 'USD' },
        modifiers: [],
      },
    ],
    ...overrides,
  };
}

describe('MockPosProvider menu and availability', () => {
  it('seeds a menu with an unavailable item to exercise the 86 path', async () => {
    const p = createMockPosProvider();
    const res = await p.getAvailability({ location: LOCATION });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ribeye = res.value.find((a) => a.itemId === 'item_ribeye');
    expect(ribeye?.available).toBe(false);
  });

  it('honors a runtime availability override', async () => {
    const p = createMockPosProvider();
    p.setItemAvailability('item_calamari', false);
    const res = await p.getAvailability({ location: LOCATION });
    if (!res.ok) return;
    expect(res.value.find((a) => a.itemId === 'item_calamari')?.available).toBe(false);
  });
});

describe('MockPosProvider checks', () => {
  it('returns null when no open check exists', async () => {
    const p = createMockPosProvider();
    const res = await p.getOpenCheck({ location: LOCATION, table: TABLE });
    expect(res.ok && res.value).toBeNull();
  });

  it('returns a seeded open check for the bound table', async () => {
    const p = createMockPosProvider();
    p.seedOpenCheck({ checkId: 'chk_1', table: TABLE, status: 'open' });
    const res = await p.getOpenCheck({ location: LOCATION, table: TABLE });
    expect(res.ok && res.value?.checkId).toBe('chk_1');
  });
});

describe('MockPosProvider order idempotency', () => {
  it('replays the same reference for a repeated key and never duplicates', async () => {
    const p = createMockPosProvider();
    const first = await p.submitOrder(submission('idem_1'));
    const second = await p.submitOrder(submission('idem_1', { lines: [] })); // even a tampered retry
    expect(first.status).toBe('acknowledged');
    expect(second.status).toBe('acknowledged');
    if (first.status !== 'acknowledged' || second.status !== 'acknowledged') return;
    expect(second.reference.orderId).toBe(first.reference.orderId);

    const readback = await p.getOrder({ reference: first.reference });
    expect(readback.ok && readback.value.lineCount).toBe(1);
  });
});

describe('MockPosProvider failure scenarios', () => {
  it('returns retryable_failure without persisting, so a retry can still succeed', async () => {
    const p = createMockPosProvider();
    p.scriptSubmitOutcomes('retryable_failure');
    const failed = await p.submitOrder(submission('idem_retry'));
    expect(failed.status).toBe('retryable_failure');

    const retried = await p.submitOrder(submission('idem_retry'));
    expect(retried.status).toBe('acknowledged');
  });

  it('returns confirmation_unknown for ambiguous results (reconcile only)', async () => {
    const p = createMockPosProvider();
    p.scriptSubmitOutcomes('confirmation_unknown');
    const outcome = await p.submitOrder(submission('idem_unknown'));
    expect(outcome.status).toBe('confirmation_unknown');
  });

  it('persists a scripted rejection terminally', async () => {
    const p = createMockPosProvider();
    p.scriptSubmitOutcomes('rejected');
    const first = await p.submitOrder(submission('idem_reject'));
    const second = await p.submitOrder(submission('idem_reject'));
    expect(first.status).toBe('rejected');
    expect(second.status).toBe('rejected'); // terminal, replayed
  });

  it('rejects structurally invalid submissions', async () => {
    const p = createMockPosProvider();
    expect((await p.submitOrder(submission('k', { lines: [] }))).status).toBe('rejected');
    const badQty = submission('k2', {
      lines: [
        {
          itemId: 'item_calamari',
          name: 'Crispy Calamari',
          quantity: 0,
          unitPrice: { amountMinor: 1400, currency: 'USD' },
          modifiers: [],
        },
      ],
    });
    expect((await p.submitOrder(badQty)).status).toBe('rejected');
  });

  it('degraded mode: reads error and submissions become retryable', async () => {
    const p = createMockPosProvider();
    p.setOffline(true);
    expect((await p.getMenu({ location: LOCATION })).ok).toBe(false);
    expect((await p.getAvailability({ location: LOCATION })).ok).toBe(false);
    expect((await p.submitOrder(submission('idem_offline'))).status).toBe('retryable_failure');

    p.setOffline(true);
  });
});

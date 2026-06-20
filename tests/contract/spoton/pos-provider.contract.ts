import { describe, expect, it } from 'vitest';

import type {
  OrderSubmission,
  PosProvider,
  ProviderLocationRef,
  ProviderTableRef,
} from '@/modules/spoton';

/**
 * Reusable PosProvider contract (D1 acceptance: "Contract-test suite reusable
 * against sandbox").
 *
 * These assertions describe provider-neutral guarantees that BOTH the mock and
 * the real SpotOn client (D2) must satisfy, expressed only through the
 * `PosProvider` port — no mock-only seams, no seed-specific values. Point it at
 * a sandbox-backed provider later by calling it with a different factory.
 *
 * Mock-only behavior (forced failures, degraded mode) is intentionally NOT
 * here — a live sandbox cannot be commanded to fail on demand. Those live in
 * the mock's unit tests.
 */

export interface PosProviderContractConfig {
  /** A location the provider can serve a menu for. */
  readonly location: ProviderLocationRef;
  /** A table to look up checks against (may or may not have an open check). */
  readonly table: ProviderTableRef;
}

export function describePosProviderContract(
  label: string,
  makeProvider: () => PosProvider | Promise<PosProvider>,
  config: PosProviderContractConfig,
): void {
  describe(`PosProvider contract: ${label}`, () => {
    async function provider(): Promise<PosProvider> {
      return makeProvider();
    }

    it('exposes a stable providerId', async () => {
      const p = await provider();
      expect(typeof p.providerId).toBe('string');
      expect(p.providerId.length).toBeGreaterThan(0);
    });

    it('returns a structurally valid menu with money-typed prices', async () => {
      const p = await provider();
      const res = await p.getMenu({ location: config.location });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const menu = res.value;
      expect(menu.menuVersion.length).toBeGreaterThan(0);
      expect(menu.categories.length).toBeGreaterThan(0);
      expect(menu.items.length).toBeGreaterThan(0);
      for (const item of menu.items) {
        expect(item.itemId.length).toBeGreaterThan(0);
        expect(Number.isInteger(item.basePrice.amountMinor)).toBe(true);
        expect(item.basePrice.amountMinor).toBeGreaterThanOrEqual(0);
        expect(item.basePrice.currency).toBe('USD');
      }
    });

    it('returns availability entries that reference menu items', async () => {
      const p = await provider();
      const menuRes = await p.getMenu({ location: config.location });
      const availRes = await p.getAvailability({ location: config.location });
      expect(availRes.ok).toBe(true);
      if (!availRes.ok || !menuRes.ok) return;
      const itemIds = new Set(menuRes.value.items.map((i) => i.itemId));
      for (const a of availRes.value) {
        expect(itemIds.has(a.itemId)).toBe(true);
        expect(typeof a.available).toBe('boolean');
      }
    });

    it('treats a missing open check as a non-error null result', async () => {
      const p = await provider();
      const res = await p.getOpenCheck({ location: config.location, table: config.table });
      // Either an open check or null — both are ok; absence is never an error.
      expect(res.ok).toBe(true);
    });

    it('acknowledges a valid order and reads it back', async () => {
      const p = await provider();
      const submission = await buildValidSubmission(p, config, 'contract-ack');
      const outcome = await p.submitOrder(submission);
      expect(outcome.status).toBe('acknowledged');
      if (outcome.status !== 'acknowledged') return;
      expect(outcome.reference.orderId.length).toBeGreaterThan(0);

      const readback = await p.getOrder({ reference: outcome.reference });
      expect(readback.ok).toBe(true);
      if (!readback.ok) return;
      expect(readback.value.idempotencyKey).toBe(submission.idempotencyKey);
    });

    it('is idempotent: the same key never duplicates and returns the same reference', async () => {
      const p = await provider();
      const submission = await buildValidSubmission(p, config, 'contract-idem');
      const first = await p.submitOrder(submission);
      const second = await p.submitOrder(submission);
      expect(first.status).toBe('acknowledged');
      expect(second.status).toBe('acknowledged');
      if (first.status !== 'acknowledged' || second.status !== 'acknowledged') return;
      expect(second.reference.orderId).toBe(first.reference.orderId);
    });

    it('rejects a structurally invalid order (no lines)', async () => {
      const p = await provider();
      const base = await buildValidSubmission(p, config, 'contract-invalid');
      const outcome = await p.submitOrder({ ...base, lines: [] });
      expect(outcome.status).toBe('rejected');
    });
  });
}

/** Build a valid single-line submission from the provider's own menu. */
async function buildValidSubmission(
  provider: PosProvider,
  config: PosProviderContractConfig,
  keySuffix: string,
): Promise<OrderSubmission> {
  const menuRes = await provider.getMenu({ location: config.location });
  if (!menuRes.ok) throw new Error('contract setup: getMenu failed');
  const item = menuRes.value.items[0];
  if (!item) throw new Error('contract setup: menu has no items');
  return {
    idempotencyKey: `idem_${keySuffix}_${item.itemId}`,
    location: config.location,
    table: config.table,
    employee: { employeeId: 'emp_contract' },
    menuVersion: menuRes.value.menuVersion,
    lines: [
      {
        itemId: item.itemId,
        name: item.name,
        quantity: 1,
        unitPrice: item.basePrice,
        modifiers: [],
      },
    ],
  };
}

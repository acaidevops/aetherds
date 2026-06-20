/**
 * In-memory mock PosProvider (D1 acceptance: "Mock menu, availability, check,
 * order, and failure scenarios").
 *
 * Deterministic and dependency-free so it backs local dev, the guest/staff
 * flows before D2, and the reusable contract suite. Failure scenarios are
 * injected through mock-only helpers (`setOffline`, `scriptSubmitOutcomes`,
 * `seedOpenCheck`) that are NOT part of the PosProvider port — the port stays
 * provider-neutral and the real SpotOn client never grows test seams.
 *
 * Idempotency (integration doc §8): submissions are keyed by their immutable
 * idempotency key. Re-submitting an acknowledged key returns the original
 * reference and never creates a duplicate.
 */

import type { PosProvider } from '../contracts/pos-provider';
import type { ProviderAvailability } from '../domain/availability';
import type { ProviderCheck } from '../domain/check';
import type { ProviderMenu } from '../domain/menu';
import type { OrderSubmission, ProviderOrderRecord } from '../domain/order';
import type { ProviderLocationRef, ProviderOrderReference, ProviderTableRef } from '../domain/refs';
import {
  err,
  ok,
  type OrderSubmitOutcome,
  type ProviderError,
  type ProviderResult,
} from '../domain/result';
import { buildMockMenu } from './mock-menu-seed';

/** Failure outcomes a test can script for the next new submission(s). */
export type ScriptableSubmitStatus = 'retryable_failure' | 'confirmation_unknown' | 'rejected';

export interface MockPosProviderOptions {
  /** Override the clock for deterministic timestamps. */
  readonly now?: () => Date;
}

interface StoredOrder {
  readonly outcome: Extract<OrderSubmitOutcome, { status: 'acknowledged' | 'rejected' }>;
  readonly record?: ProviderOrderRecord;
}

const UNAVAILABLE = {
  kind: 'unavailable',
  message: 'POS provider is offline (mock degraded mode).',
  retryable: true,
} as const;

export class MockPosProvider implements PosProvider {
  readonly providerId = 'mock';

  private readonly now: () => Date;
  private readonly menu: ProviderMenu;
  private readonly availabilityOverrides = new Map<string, boolean>();
  private readonly openChecks = new Map<string, ProviderCheck>();
  private readonly ordersByKey = new Map<string, StoredOrder>();
  private readonly ordersById = new Map<string, ProviderOrderRecord>();
  private readonly scriptedOutcomes: ScriptableSubmitStatus[] = [];
  private offline = false;

  constructor(options: MockPosProviderOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.menu = buildMockMenu(this.now().toISOString());
  }

  // --- mock-only controls (not part of PosProvider) ---

  /** Toggle degraded mode: reads error and submissions become retryable. */
  setOffline(offline: boolean): void {
    this.offline = offline;
  }

  /** Queue forced outcomes consumed by the next new-key submissions, in order. */
  scriptSubmitOutcomes(...statuses: ScriptableSubmitStatus[]): void {
    this.scriptedOutcomes.push(...statuses);
  }

  /** Seed an open check so getOpenCheck returns it for the given table. */
  seedOpenCheck(check: ProviderCheck): void {
    this.openChecks.set(check.table.tableId, check);
  }

  /** Mark an item unavailable (or available) for availability reads. */
  setItemAvailability(itemId: string, available: boolean): void {
    this.availabilityOverrides.set(itemId, available);
  }

  // --- PosProvider ---

  async getMenu(req: {
    readonly location: ProviderLocationRef;
  }): Promise<ProviderResult<ProviderMenu>> {
    const blocked = this.guard(req.location);
    if (blocked) return err(blocked);
    return ok(this.menu);
  }

  async getAvailability(req: {
    readonly location: ProviderLocationRef;
  }): Promise<ProviderResult<readonly ProviderAvailability[]>> {
    const blocked = this.guard(req.location);
    if (blocked) return err(blocked);
    const list: ProviderAvailability[] = this.menu.items.map((item) => ({
      itemId: item.itemId,
      available: this.availabilityOverrides.get(item.itemId) ?? item.available,
    }));
    return ok(list);
  }

  async getOpenCheck(req: {
    readonly location: ProviderLocationRef;
    readonly table: ProviderTableRef;
  }): Promise<ProviderResult<ProviderCheck | null>> {
    const blocked = this.guard(req.location);
    if (blocked) return err(blocked);
    return ok(this.openChecks.get(req.table.tableId) ?? null);
  }

  /** Common precondition: provider reachable and a location scope supplied. */
  private guard(location: ProviderLocationRef): ProviderError | null {
    if (this.offline) return UNAVAILABLE;
    if (!location?.locationId) {
      return { kind: 'unauthorized', message: 'A location scope is required.', retryable: false };
    }
    return null;
  }

  async submitOrder(submission: OrderSubmission): Promise<OrderSubmitOutcome> {
    // Idempotency: a terminal result for this key is replayed verbatim — no
    // duplicate order is ever created.
    const existing = this.ordersByKey.get(submission.idempotencyKey);
    if (existing) return existing.outcome;

    if (this.offline) {
      return { status: 'retryable_failure', error: UNAVAILABLE };
    }

    const invalid = validateSubmission(submission);
    if (invalid) return { status: 'rejected', error: invalid };

    // Non-terminal scripted failures (retryable/unknown) are NOT persisted, so a
    // later retry with the same key may still succeed — exactly the real retry
    // semantics. Only terminal outcomes (rejected) and acknowledgments persist.
    const scripted = this.scriptedOutcomes.shift();
    if (scripted === 'retryable_failure') {
      return {
        status: 'retryable_failure',
        error: {
          kind: 'unavailable',
          message: 'Transient provider failure (scripted).',
          retryable: true,
        },
      };
    }
    if (scripted === 'confirmation_unknown') {
      return {
        status: 'confirmation_unknown',
        detail: 'Provider acknowledgment ambiguous (scripted).',
      };
    }
    if (scripted === 'rejected') {
      const rejected: OrderSubmitOutcome = {
        status: 'rejected',
        error: {
          kind: 'invalid',
          message: 'Provider rejected the order (scripted).',
          retryable: false,
        },
      };
      this.ordersByKey.set(submission.idempotencyKey, { outcome: rejected });
      return rejected;
    }

    // Acknowledged path.
    const reference: ProviderOrderReference = {
      orderId: `mock_order_${submission.idempotencyKey}`,
      checkId: submission.check?.checkId ?? `mock_check_${submission.table.tableId}`,
    };
    const record: ProviderOrderRecord = {
      reference,
      status: 'acknowledged',
      idempotencyKey: submission.idempotencyKey,
      lineCount: submission.lines.length,
    };
    const outcome: OrderSubmitOutcome = { status: 'acknowledged', reference };
    this.ordersByKey.set(submission.idempotencyKey, { outcome, record });
    this.ordersById.set(reference.orderId, record);
    return outcome;
  }

  async getOrder(req: {
    readonly reference: ProviderOrderReference;
  }): Promise<ProviderResult<ProviderOrderRecord>> {
    if (this.offline) return err(UNAVAILABLE);
    const record = this.ordersById.get(req.reference.orderId);
    if (!record) {
      return err({
        kind: 'not_found',
        message: 'No order for the given reference.',
        retryable: false,
      });
    }
    return ok(record);
  }
}

function validateSubmission(submission: OrderSubmission) {
  if (!submission.idempotencyKey) {
    return { kind: 'invalid', message: 'Missing idempotency key.', retryable: false } as const;
  }
  if (submission.lines.length === 0) {
    return { kind: 'invalid', message: 'Order has no lines.', retryable: false } as const;
  }
  if (submission.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) {
    return {
      kind: 'invalid',
      message: 'Order line has a non-positive quantity.',
      retryable: false,
    } as const;
  }
  return null;
}

/** Convenience factory mirroring the future real-client factory shape. */
export function createMockPosProvider(options?: MockPosProviderOptions): MockPosProvider {
  return new MockPosProvider(options);
}

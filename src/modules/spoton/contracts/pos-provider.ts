/**
 * PosProvider — the provider-neutral port (D1 acceptance: "Provider-neutral
 * AETHER interface").
 *
 * Every capability AETHER needs from a point-of-sale provider is expressed
 * here in AETHER's own terms. The mock (infrastructure/mock-pos-provider) and
 * the future real SpotOn client (D2) both implement this interface, and the
 * same contract-test suite runs against either — so no SpotOn endpoint name,
 * payload shape, or auth detail leaks into domain or application code.
 *
 * Capabilities are intentionally minimal for MVP per integration doc §3:
 * "No unverified capability is launch-critical except reliable menu read,
 * order write, and reconciliation."
 */

import type { ProviderAvailability } from '../domain/availability';
import type { ProviderCheck } from '../domain/check';
import type { ProviderMenu } from '../domain/menu';
import type { OrderSubmission, ProviderOrderRecord } from '../domain/order';
import type { ProviderLocationRef, ProviderOrderReference, ProviderTableRef } from '../domain/refs';
import type { OrderSubmitOutcome, ProviderResult } from '../domain/result';

export interface PosProvider {
  /** Stable identifier of the concrete provider, e.g. 'mock' or 'spoton'. */
  readonly providerId: string;

  /** Read the transactional menu for a location (integration doc §5). */
  getMenu(req: { readonly location: ProviderLocationRef }): Promise<ProviderResult<ProviderMenu>>;

  /** Read current item availability (integration doc §5). */
  getAvailability(req: {
    readonly location: ProviderLocationRef;
  }): Promise<ProviderResult<readonly ProviderAvailability[]>>;

  /**
   * Look up an existing open check for a table (integration doc §6). Resolves
   * to `null` when no open check exists — that is a normal, non-error result.
   */
  getOpenCheck(req: {
    readonly location: ProviderLocationRef;
    readonly table: ProviderTableRef;
  }): Promise<ProviderResult<ProviderCheck | null>>;

  /**
   * Submit an approved order. Idempotent on `submission.idempotencyKey`:
   * resubmitting the same key MUST NOT create a duplicate and MUST return the
   * original acknowledgment (integration doc §8).
   */
  submitOrder(submission: OrderSubmission): Promise<OrderSubmitOutcome>;

  /** Read an order back by reference for reconciliation (integration doc §8). */
  getOrder(req: {
    readonly reference: ProviderOrderReference;
  }): Promise<ProviderResult<ProviderOrderRecord>>;
}

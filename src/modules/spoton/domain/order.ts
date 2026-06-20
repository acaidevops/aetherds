/**
 * Provider-neutral order submission and read-back.
 *
 * An OrderSubmission is the immutable, server-approved batch handed to the
 * provider. It carries exactly one idempotency key for its approval group
 * (domain-model.md §4: "A SpotOn operation has one immutable idempotency key";
 * state-machines.md §4: "Never generate a replacement idempotency key"). Lines
 * mirror the order item snapshot (domain-model.md §6) reduced to the fields the
 * provider needs to create the order; AETHER-only context (allergen flags,
 * shared-item participants) stays in AETHER.
 */

import type { MoneyShape } from '@/shared/money';

import type {
  ProviderCheckRef,
  ProviderEmployeeRef,
  ProviderItemRef,
  ProviderLocationRef,
  ProviderModifierRef,
  ProviderOrderReference,
  ProviderTableRef,
} from './refs';

export interface OrderLineModifier extends ProviderModifierRef {
  readonly name: string;
  readonly priceDelta: MoneyShape;
}

export interface OrderLine extends ProviderItemRef {
  readonly name: string;
  readonly quantity: number;
  /** Quoted unit price at approval time; the provider re-prices authoritatively. */
  readonly unitPrice: MoneyShape;
  readonly modifiers: readonly OrderLineModifier[];
  /** Optional seat/diner the line is assigned to. */
  readonly seat?: number;
  /** Server-reviewed guest note; already redacted of unsafe content. */
  readonly note?: string;
}

export interface OrderSubmission {
  /** Immutable, reused for every retry of this approval group. */
  readonly idempotencyKey: string;
  readonly location: ProviderLocationRef;
  readonly table: ProviderTableRef;
  /** Append to this check when known; otherwise the provider opens/links one. */
  readonly check?: ProviderCheckRef;
  /** Approving server's provider employee mapping (integration doc §9). */
  readonly employee: ProviderEmployeeRef;
  readonly lines: readonly OrderLine[];
  /** Opaque provider menu version the lines were quoted against. */
  readonly menuVersion: string;
}

export type ProviderOrderStatus = 'acknowledged' | 'in_kitchen' | 'closed';

/** Read-back record used for reconciliation (integration doc §8). */
export interface ProviderOrderRecord {
  readonly reference: ProviderOrderReference;
  readonly status: ProviderOrderStatus;
  readonly idempotencyKey: string;
  readonly lineCount: number;
}

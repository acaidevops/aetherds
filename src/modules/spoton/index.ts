/**
 * Public surface for the spoton (POS integration) module.
 *
 * Responsibility: outbox, idempotency, OAuth, webhooks, reconciliation
 * (system-architecture.md §3). D1 delivers the provider-neutral PosProvider
 * port plus an in-memory mock; the real SpotOn client and durable submission
 * pipeline arrive in D2/D4.
 *
 * Per ADR 0004, cross-module imports MUST go through this barrel — never the
 * domain/infrastructure internals. dependency-cruiser enforces this in CI.
 */

// Port
export type { PosProvider } from './contracts/pos-provider';

// Provider-neutral domain types
export type {
  ProviderMenu,
  ProviderMenuItem,
  ProviderMenuCategory,
  ProviderModifierGroup,
  ProviderModifier,
} from './domain/menu';
export type { ProviderAvailability } from './domain/availability';
export type { ProviderCheck, ProviderCheckStatus } from './domain/check';
export type {
  OrderSubmission,
  OrderLine,
  OrderLineModifier,
  ProviderOrderRecord,
  ProviderOrderStatus,
} from './domain/order';
export type {
  ProviderLocationRef,
  ProviderTableRef,
  ProviderItemRef,
  ProviderModifierRef,
  ProviderCheckRef,
  ProviderOrderReference,
  ProviderEmployeeRef,
} from './domain/refs';
export type {
  ProviderResult,
  ProviderError,
  ProviderErrorKind,
  OrderSubmitOutcome,
} from './domain/result';

// Application seam
export { getPosProvider, __setPosProviderForTests } from './application/get-pos-provider';

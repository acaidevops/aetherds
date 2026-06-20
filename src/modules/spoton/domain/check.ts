/**
 * Provider-neutral check projection.
 *
 * Check linking rules (integration doc §6): at session start AETHER queries for
 * an existing open check; one AETHER session maps to one provider check in MVP;
 * split checks remain entirely in the provider. AETHER never fabricates a
 * check — it either finds an open one or defers creation to the first approved
 * order.
 */

import type { ProviderCheckRef, ProviderTableRef } from './refs';

export type ProviderCheckStatus = 'open' | 'closed';

export interface ProviderCheck extends ProviderCheckRef {
  readonly table: ProviderTableRef;
  readonly status: ProviderCheckStatus;
  /** Opened time when known, UTC ISO-8601. */
  readonly openedAt?: string;
}

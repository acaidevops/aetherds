/**
 * SpotOn / POS integration — provider-neutral reference types.
 *
 * Per ADR 0002 (SpotOn owns transactional truth) and ADR 0006, every
 * transactional identifier — location, table, item, modifier, check, order —
 * is OWNED by the provider and opaque to AETHER. AETHER never invents these
 * ids; it stores and echoes them. Modeling them as distinct opaque-string
 * wrappers keeps "provider-neutral" honest: no module may assume a SpotOn URL,
 * payload shape, or id format (D1 acceptance: "No production assumptions hidden
 * in domain code").
 */

export interface ProviderLocationRef {
  /** Opaque provider location/merchant identifier. */
  readonly locationId: string;
}

export interface ProviderTableRef {
  /** Opaque provider table identifier (the SpotOn side of an AETHER mapping). */
  readonly tableId: string;
}

export interface ProviderItemRef {
  readonly itemId: string;
}

export interface ProviderModifierRef {
  readonly modifierId: string;
}

export interface ProviderCheckRef {
  readonly checkId: string;
}

export interface ProviderOrderReference {
  /** Provider order/check reference returned on acknowledgment. */
  readonly orderId: string;
  /** The check the order was appended to, when the provider exposes it. */
  readonly checkId: string;
}

export interface ProviderEmployeeRef {
  /** Provider employee the approving server maps to (integration doc §9). */
  readonly employeeId: string;
}

/**
 * Provider-neutral menu projection.
 *
 * This is the transactional menu as the provider reports it — categories,
 * items, modifiers, prices, availability (ADR 0002: SpotOn owns these). It
 * carries NO hospitality enrichment; descriptions, allergens, images, and
 * recommendations live in the menu-enrichment module (ADR 0006). Prices use the
 * shared Money value object so no floating-point creeps in (domain-model.md §5).
 */

import type { MoneyShape } from '@/shared/money';

import type { ProviderItemRef, ProviderModifierRef } from './refs';

export interface ProviderModifier extends ProviderModifierRef {
  readonly name: string;
  /** Price delta for selecting this modifier. Zero when included. */
  readonly priceDelta: MoneyShape;
  readonly available: boolean;
}

export interface ProviderModifierGroup {
  readonly groupId: string;
  readonly name: string;
  /** Selection constraints as the provider defines them. */
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly modifiers: readonly ProviderModifier[];
}

export interface ProviderMenuItem extends ProviderItemRef {
  readonly name: string;
  readonly categoryId: string;
  readonly basePrice: MoneyShape;
  readonly available: boolean;
  readonly modifierGroups: readonly ProviderModifierGroup[];
}

export interface ProviderMenuCategory {
  readonly categoryId: string;
  readonly name: string;
}

export interface ProviderMenu {
  /** Opaque provider version/cursor; AETHER stores it for reconciliation. */
  readonly menuVersion: string;
  readonly categories: readonly ProviderMenuCategory[];
  readonly items: readonly ProviderMenuItem[];
  /** When the snapshot was read, UTC ISO-8601. */
  readonly retrievedAt: string;
}

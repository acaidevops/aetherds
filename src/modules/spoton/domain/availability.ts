/**
 * Provider-neutral availability projection.
 *
 * Availability is provider-owned and may change independently of menu
 * structure (integration doc §5: "Apply availability restrictions
 * immediately"). It is modeled separately from the menu so availability
 * webhooks/polls can update it without re-importing structure.
 */

import type { ProviderItemRef } from './refs';

export interface ProviderAvailability extends ProviderItemRef {
  readonly available: boolean;
  /** Optional provider-supplied reason (e.g. "86'd"); redacted, display-safe. */
  readonly reason?: string;
}

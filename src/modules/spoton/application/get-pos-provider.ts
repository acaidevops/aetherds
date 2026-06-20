import 'server-only';

import type { PosProvider } from '../contracts/pos-provider';
import { createMockPosProvider } from '../infrastructure/mock-pos-provider';

/**
 * Resolve the PosProvider implementation for the running environment.
 *
 * Other modules and routes depend on the `PosProvider` PORT, never on a
 * concrete implementation, so this seam can swap the mock for the real SpotOn
 * client (D2) without touching callers. Until D2 (OAuth/location authorization)
 * lands — and because the real client is blocked on SpotOn partner access — the
 * mock is the only implementation. The decision is centralized here rather than
 * read ad hoc so there is exactly one place to flip per environment.
 */

let cached: PosProvider | null = null;

export function getPosProvider(): PosProvider {
  if (cached) return cached;
  // D2 will branch on configuration/feature flag to return the real client.
  cached = createMockPosProvider();
  return cached;
}

/** Test-only hook to inject a fake/alternate provider. */
export function __setPosProviderForTests(provider: PosProvider | null): void {
  cached = provider;
}

import { createMockPosProvider } from '@/modules/spoton/infrastructure/mock-pos-provider';

import { describePosProviderContract } from './pos-provider.contract';

/**
 * Runs the reusable PosProvider contract against the in-memory mock. The same
 * `describePosProviderContract` call will later be pointed at a sandbox-backed
 * SpotOn client (D2) to prove the real adapter honors the same guarantees.
 *
 * A fresh provider per case keeps idempotency/state assertions independent.
 */
describePosProviderContract('MockPosProvider', () => createMockPosProvider(), {
  location: { locationId: 'loc_mock' },
  table: { tableId: 'tbl_mock_1' },
});

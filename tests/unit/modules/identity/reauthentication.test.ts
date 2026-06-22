import { describe, expect, it } from 'vitest';

import {
  assertRecentReauthentication,
  DEFAULT_REAUTH_MAX_AGE_MS,
  ReauthenticationRequiredError,
  requiresReauthentication,
} from '@/modules/identity';

const now = new Date('2026-06-21T12:00:00Z');

describe('privileged-command step-up reauthentication', () => {
  it('flags privileged commands and ignores ordinary ones', () => {
    expect(requiresReauthentication('manager.override')).toBe(true);
    expect(requiresReauthentication('membership.grant')).toBe(true);
    expect(requiresReauthentication('cart.add_item')).toBe(false);
  });

  it('throws when no reauthentication is recorded', () => {
    expect(() => assertRecentReauthentication({ command: 'manager.override', now })).toThrow(
      ReauthenticationRequiredError,
    );
  });

  it('throws when the reauthentication is older than the window', () => {
    const stale = new Date(now.getTime() - DEFAULT_REAUTH_MAX_AGE_MS - 1);
    expect(() =>
      assertRecentReauthentication({ command: 'device.revoke', reauthenticatedAt: stale, now }),
    ).toThrow(ReauthenticationRequiredError);
  });

  it('passes when the reauthentication is within the window', () => {
    const fresh = new Date(now.getTime() - 60_000);
    expect(() =>
      assertRecentReauthentication({ command: 'device.revoke', reauthenticatedAt: fresh, now }),
    ).not.toThrow();
  });

  it('tolerates a future-dated stamp (clock skew), rejecting only staleness', () => {
    const future = new Date(now.getTime() + 30_000);
    expect(() =>
      assertRecentReauthentication({ command: 'session.transfer', reauthenticatedAt: future, now }),
    ).not.toThrow();
  });
});

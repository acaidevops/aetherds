import { describe, expect, it } from 'vitest';

import { generateCredential, hashToken, tokenMatchesHash } from '@/modules/devices';

describe('device credential', () => {
  it('generates a high-entropy token plus a one-way hash (never the token)', () => {
    const a = generateCredential();
    const b = generateCredential();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token); // hash does not embed the token
    expect(a.token.length).toBeGreaterThanOrEqual(40);
  });

  it('hashes deterministically and verifies in constant time', () => {
    const { token, tokenHash } = generateCredential();
    expect(hashToken(token)).toBe(tokenHash);
    expect(tokenMatchesHash(token, tokenHash)).toBe(true);
    expect(tokenMatchesHash('wrong-token', tokenHash)).toBe(false);
  });
});

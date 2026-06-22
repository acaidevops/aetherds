import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Devices domain: the revocable device credential.
 *
 * The plaintext token is a high-entropy secret shown to the manager ONCE at
 * provisioning (the one-time setup flow) and never stored. Only its sha-256
 * hash is persisted, so a database read can never recover a usable credential
 * (security-privacy.md §7). Verification hashes the presented token and
 * compares in constant time.
 */

export type CredentialStatus = 'active' | 'revoked';

export interface DeviceCredential {
  readonly id: string;
  readonly deviceId: string;
  readonly tokenHash: string;
  readonly status: CredentialStatus;
}

export interface GeneratedCredential {
  /** Show to the manager once; never persist. */
  readonly token: string;
  /** Persist this; never reversible to the token. */
  readonly tokenHash: string;
}

/** Hash a credential token (sha-256, hex). Deterministic, one-way. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Mint a fresh device credential: a 256-bit url-safe token plus its hash. */
export function generateCredential(): GeneratedCredential {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

/** Constant-time comparison of a presented token against a stored hash. */
export function tokenMatchesHash(token: string, tokenHash: string): boolean {
  const presented = Buffer.from(hashToken(token), 'utf8');
  const stored = Buffer.from(tokenHash, 'utf8');
  if (presented.length !== stored.length) return false;
  return timingSafeEqual(presented, stored);
}

/**
 * Authentication principal and tenant scope (ADR 0010 baseline).
 *
 * Scope is ALWAYS server-derived from authenticated identity, never from
 * client-provided IDs (see ADR 0010 and api-contracts.md §11).
 */

export type Role = 'owner' | 'manager' | 'server' | 'platform_operator' | 'food_safety_approver';

/** Authentication context that produced this principal. */
export type AuthContext =
  | { readonly kind: 'staff'; readonly userId: string }
  | { readonly kind: 'device'; readonly deviceId: string }
  | { readonly kind: 'service' };

/** Server-derived tenant scope. Never constructed from client input directly. */
export interface TenantScope {
  readonly restaurantId: string;
  readonly locationId: string;
}

export interface Principal {
  readonly context: AuthContext;
  readonly role: Role;
  /** Tenant scope. Absent for platform-wide service identities until narrowed. */
  readonly scope?: TenantScope;
}

/**
 * Assert a principal has access to the given tenant scope. Returns the scope on
 * success so callers can pass it downstream. Throws `AuthScopeDeniedError` on
 * mismatch — the API layer maps this to the stable `AUTH_SCOPE_DENIED` error.
 */
export function assertScope(principal: Principal, requested: TenantScope): TenantScope {
  const granted = principal.scope;
  if (!granted) {
    throw new AuthScopeDeniedError('Principal has no tenant scope to satisfy the request.');
  }
  if (
    granted.restaurantId !== requested.restaurantId ||
    granted.locationId !== requested.locationId
  ) {
    throw new AuthScopeDeniedError('Requested scope exceeds granted scope.');
  }
  return requested;
}

export class AuthScopeDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthScopeDeniedError';
  }
}

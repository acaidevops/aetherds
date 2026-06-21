/**
 * Identity domain: role authorization.
 *
 * Authentication does not imply authorization (api-contracts.md §2). A command
 * declares the roles permitted to run it; this policy decides whether a
 * membership's role satisfies that requirement. Owner outranks manager outranks
 * server; `food_safety_approver` is an independent track (it is not "above"
 * server for operational commands), so the rank ladder covers the operational
 * hierarchy and explicit role lists cover the rest.
 */

import type { StaffRole } from './membership';

/** Operational hierarchy rank. Higher satisfies "at least" checks. */
const OPERATIONAL_RANK: Readonly<Record<StaffRole, number>> = {
  server: 1,
  manager: 2,
  owner: 3,
  // Independent safety track — not part of the operational ladder.
  food_safety_approver: 0,
};

/** True when `role` is at least `minimum` on the operational ladder. */
export function hasAtLeast(
  role: StaffRole,
  minimum: Exclude<StaffRole, 'food_safety_approver'>,
): boolean {
  return OPERATIONAL_RANK[role] >= OPERATIONAL_RANK[minimum];
}

/** True when `role` is one of the explicitly permitted roles. Accepts a plain
 * string so a principal's broader `Role` (which may be `platform_operator`)
 * simply fails to match a staff-role list rather than needing a cast. */
export function isPermitted(role: string, permitted: readonly StaffRole[]): boolean {
  return (permitted as readonly string[]).includes(role);
}

export class RoleNotPermittedError extends Error {
  readonly role: string;
  readonly permitted: readonly StaffRole[];
  constructor(role: string, permitted: readonly StaffRole[]) {
    super(`Role '${role}' is not permitted (requires one of: ${permitted.join(', ')}).`);
    this.name = 'RoleNotPermittedError';
    this.role = role;
    this.permitted = permitted;
  }
}

/**
 * Assert `role` is one of `permitted`, throwing {@link RoleNotPermittedError}
 * otherwise. The API layer maps this to the stable `AUTH_SCOPE_DENIED` error.
 */
export function assertRolePermitted(role: string, permitted: readonly StaffRole[]): void {
  if (!isPermitted(role, permitted)) {
    throw new RoleNotPermittedError(role, permitted);
  }
}

/**
 * Public surface for the identity module (B1).
 *
 * Responsibility: auth, memberships, roles, restaurant/location scope
 * (system-architecture.md §3). Delivers staff principal resolution from
 * location membership, role authorization, and the step-up reauthentication
 * hook for privileged commands.
 *
 * Per ADR 0004, cross-module imports MUST go through this barrel; the real
 * SupabaseMembershipRepository is exported for the composition root (route
 * handlers / DI), while domain internals stay private.
 */

// Domain types + policies
export type { StaffUser, Membership, StaffRole, AccountStatus } from './domain/membership';
export { membershipScope, isActive } from './domain/membership';
export {
  hasAtLeast,
  isPermitted,
  assertRolePermitted,
  RoleNotPermittedError,
} from './domain/authorization';
export {
  type PrivilegedCommand,
  requiresReauthentication,
  assertRecentReauthentication,
  ReauthenticationRequiredError,
  DEFAULT_REAUTH_MAX_AGE_MS,
} from './domain/reauthentication';

// Application services + ports
export type { MembershipRepository } from './application/ports';
export {
  resolveStaffPrincipal,
  type ResolveStaffPrincipalInput,
} from './application/resolve-principal';
export {
  authorizeStaffCommand,
  type AuthorizeStaffCommandInput,
} from './application/authorize-command';

// Infrastructure (composition root only)
export { InMemoryMembershipRepository } from './infrastructure/in-memory-membership-repository';
export { SupabaseMembershipRepository } from './infrastructure/supabase-membership-repository';

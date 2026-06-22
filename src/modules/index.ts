/**
 * Public surface for all modules.
 *
 * Responsibility: Central export point for all domain modules (system-architecture.md §3).
 *
 * Per ADR 0004 (Modular Monolith), cross-module imports MUST go through module
 * barrels; dependency-cruiser enforces boundaries. This file re-exports public
 * APIs from each module for convenience at the composition root.
 *
 * Note: We avoid wildcard exports here to prevent naming conflicts between modules.
 * Consumers should import directly from specific module barrels (e.g., '@/modules/menu')
 * rather than from this central index.
 */

// Audit module - Event recording and audit trail
export type {
  AuditEvent,
  AuditEventOutcome,
  AuditEventBeforeAfter,
  CreateAuditEventInput,
  AuditEventInput,
  RecordAuditEventDeps,
  AuditEventRepository,
} from './audit';
export {
  recordAuditEvent,
  createAuditEvent,
  __setDefaultAuditRepoFactoryForTests,
} from './audit';

// Identity module - Authentication, authorization, and membership
export type {
  StaffUser,
  Membership,
  StaffRole,
  AccountStatus,
  PrivilegedCommand,
  MembershipRepository,
  ResolveStaffPrincipalInput,
  AuthorizeStaffCommandInput,
} from './identity';
export {
  membershipScope,
  isActive as isMembershipActive,
  hasAtLeast,
  isPermitted,
  assertRolePermitted,
  RoleNotPermittedError,
  requiresReauthentication,
  assertRecentReauthentication,
  ReauthenticationRequiredError,
  DEFAULT_REAUTH_MAX_AGE_MS,
  resolveStaffPrincipal,
  authorizeStaffCommand,
  InMemoryMembershipRepository,
  SupabaseMembershipRepository,
} from './identity';

// Menu module - Menu import, normalization, and mapping management
export type {
  MenuSnapshot,
  CreateMenuSnapshotInput,
  MenuMapping,
  CreateMenuMappingInput,
  UpdateMenuMappingInput,
  MappingStatus,
  EntityType,
  SyncCursor,
  UpsertSyncCursorInput,
  SyncStatus,
  MenuSnapshotRepository,
  MenuMappingRepository,
  SyncCursorRepository,
  ImportMenuInput,
  ImportMenuResult,
  ImportStats,
  ImportMenuDeps,
} from './menu';
export {
  isActive as isMappingActive,
  isBroken,
  markBroken,
  markArchived,
  isFresh,
  isStale,
  hasError,
  markSyncSuccess,
  markSyncError,
  markSyncStale,
  importMenu,
  SupabaseMenuSnapshotRepository,
  SupabaseMenuMappingRepository,
  SupabaseSyncCursorRepository,
} from './menu';

// SpotOn module - POS provider integration contracts
export * from './spoton';

// Platform Operations module - System health and operational concerns
export * from './platform-operations';

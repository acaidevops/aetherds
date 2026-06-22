import 'server-only';

import { assertScope, type Principal, type TenantScope } from '@/shared/auth';

import { assertRolePermitted } from '../domain/authorization';
import type { StaffRole } from '../domain/membership';
import { assertRecentReauthentication, requiresReauthentication } from '../domain/reauthentication';

/**
 * Single authorization gate for a staff command. Composes the three checks a
 * privileged operation needs, in order:
 *
 *  1. Scope — the principal's tenant scope must match the requested scope
 *     (ADR 0010; throws AuthScopeDeniedError).
 *  2. Role — the principal's role must be one of the command's permitted roles
 *     (throws RoleNotPermittedError).
 *  3. Step-up — if the command is privileged, a recent reauthentication is
 *     required (throws ReauthenticationRequiredError).
 *
 * Route handlers call this before invoking a module application service, so
 * authorization lives in one auditable place rather than scattered per route.
 */
export interface AuthorizeStaffCommandInput {
  readonly principal: Principal;
  readonly scope: TenantScope;
  readonly permittedRoles: readonly StaffRole[];
  /** Command name; when privileged it triggers the step-up check. */
  readonly command?: string;
  /** When the principal last reauthenticated (for step-up commands). */
  readonly reauthenticatedAt?: Date;
  /** Evaluation time (injected for determinism). Defaults to now. */
  readonly now?: Date;
}

export function authorizeStaffCommand(input: AuthorizeStaffCommandInput): void {
  assertScope(input.principal, input.scope);
  assertRolePermitted(input.principal.role, input.permittedRoles);

  if (input.command && requiresReauthentication(input.command)) {
    assertRecentReauthentication({
      command: input.command,
      reauthenticatedAt: input.reauthenticatedAt,
      now: input.now ?? new Date(),
    });
  }
}

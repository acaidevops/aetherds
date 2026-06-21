/**
 * Identity domain: strong reauthentication (step-up) for privileged commands.
 *
 * Some commands are too sensitive to run on session age alone — a manager
 * override, changing who can access a location, or quarantining a device. These
 * require a *recent* reauthentication (step-up), independent of how long the
 * session has existed. This policy is pure: callers supply the timestamps; it
 * decides whether step-up is satisfied. The route/application layer wires the
 * actual credential re-prompt and records `reauthenticatedAt`.
 */

/** Commands that require a fresh reauthentication before they may run. */
export type PrivilegedCommand =
  | 'manager.override'
  | 'membership.grant'
  | 'membership.revoke'
  | 'membership.change_role'
  | 'device.provision'
  | 'device.revoke'
  | 'session.transfer';

const PRIVILEGED_COMMANDS: ReadonlySet<PrivilegedCommand> = new Set([
  'manager.override',
  'membership.grant',
  'membership.revoke',
  'membership.change_role',
  'device.provision',
  'device.revoke',
  'session.transfer',
]);

/** Default step-up freshness window: reauthentication must be within 5 minutes. */
export const DEFAULT_REAUTH_MAX_AGE_MS = 5 * 60 * 1000;

export function requiresReauthentication(command: string): command is PrivilegedCommand {
  return PRIVILEGED_COMMANDS.has(command as PrivilegedCommand);
}

export interface ReauthenticationCheck {
  readonly command: PrivilegedCommand;
  /** When the principal last completed a strong reauthentication, if ever. */
  readonly reauthenticatedAt?: Date;
  /** Evaluation time (injected for determinism). */
  readonly now: Date;
  /** Override the freshness window; defaults to {@link DEFAULT_REAUTH_MAX_AGE_MS}. */
  readonly maxAgeMs?: number;
}

export class ReauthenticationRequiredError extends Error {
  readonly command: PrivilegedCommand;
  constructor(command: PrivilegedCommand) {
    super(`Command '${command}' requires a recent reauthentication.`);
    this.name = 'ReauthenticationRequiredError';
    this.command = command;
  }
}

/**
 * Assert the principal has reauthenticated recently enough to run a privileged
 * command. Throws {@link ReauthenticationRequiredError} when no reauth is
 * recorded or it is older than the freshness window. Future-dated stamps are
 * treated as valid (clock skew); only staleness is rejected.
 */
export function assertRecentReauthentication(check: ReauthenticationCheck): void {
  const maxAge = check.maxAgeMs ?? DEFAULT_REAUTH_MAX_AGE_MS;
  const at = check.reauthenticatedAt;
  if (!at) {
    throw new ReauthenticationRequiredError(check.command);
  }
  const ageMs = check.now.getTime() - at.getTime();
  if (ageMs > maxAge) {
    throw new ReauthenticationRequiredError(check.command);
  }
}

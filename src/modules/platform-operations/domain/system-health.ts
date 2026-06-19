/**
 * Platform-operations domain: system health value object.
 *
 * Platform operations owns tenant provisioning, health, feature flags, and
 * support access (system-architecture.md §3). Health is a read-only projection
 * surfaced through the application service; it is not mutated by guests/staff.
 */

export type SystemStatus = 'ok' | 'degraded' | 'down';

export interface SystemHealth {
  readonly status: SystemStatus;
  readonly appEnv: string;
  readonly appVersion: string;
  readonly checkedAt: string; // UTC ISO-8601
  readonly checks: Readonly<Record<string, SystemCheck>>;
}

export interface SystemCheck {
  readonly name: string;
  readonly status: SystemStatus;
  readonly detail?: string;
}

export function aggregateStatus(checks: readonly SystemCheck[]): SystemStatus {
  if (checks.some((c) => c.status === 'down')) return 'down';
  if (checks.some((c) => c.status === 'degraded')) return 'degraded';
  return 'ok';
}

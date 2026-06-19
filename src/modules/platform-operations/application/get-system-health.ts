import 'server-only';

import { aggregateStatus, type SystemCheck, type SystemHealth } from '../domain/system-health';

/**
 * Application service: getSystemHealth.
 *
 * Route handlers call THIS, not domain/infrastructure internals (ADR 0004:
 * "Routes call module application services rather than mutating tables
 * directly"). The service composes domain logic and (in later epics) repository
 * ports. For A1 it returns a baseline projection derived from server config,
 * proving the route → service → domain path end-to-end.
 */

export interface GetSystemHealthDeps {
  readonly appEnv: string;
  readonly appVersion: string;
  /** Optional ports. A3 wires a real DB ping; A1 leaves it as a stub. */
  readonly pingDatabase?: () => Promise<SystemCheck>;
}

export async function getSystemHealth(deps: GetSystemHealthDeps): Promise<SystemHealth> {
  const checks: SystemCheck[] = [{ name: 'app', status: 'ok', detail: `env=${deps.appEnv}` }];

  if (deps.pingDatabase) {
    checks.push(await deps.pingDatabase());
  }

  return {
    status: aggregateStatus(checks),
    appEnv: deps.appEnv,
    appVersion: deps.appVersion,
    checkedAt: new Date().toISOString(),
    checks: Object.fromEntries(checks.map((c) => [c.name, c])),
  };
}

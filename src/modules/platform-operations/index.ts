/**
 * Public surface for the platform-operations module.
 *
 * Per ADR 0004, cross-module imports MUST use this barrel. Domain and
 * infrastructure internals are not exported here. dependency-cruiser enforces
 * this at CI time (.dependency-cruiser.cjs).
 */
export { getSystemHealth, type GetSystemHealthDeps } from './application/get-system-health';
export type { SystemHealth, SystemCheck, SystemStatus } from './domain/system-health';

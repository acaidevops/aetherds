/**
 * Public surface for the devices module (B2).
 *
 * Responsibility: revocable device identity and table binding
 * (system-architecture.md §3). Provisioning, revocation, reassignment, and
 * quarantine are manager/owner commands gated by role + step-up reauth (B1) and
 * audited (A4); device authentication verifies a hashed credential and yields a
 * scope-bound DeviceIdentity (never a staff principal — ADR 0008).
 *
 * Per ADR 0004, cross-module imports MUST go through this barrel.
 */

// Domain
export type { Device, DeviceStatus } from './domain/device';
export { canAuthenticate, DeviceNotActiveError, DeviceNotFoundError } from './domain/device';
export type { DeviceCredential, CredentialStatus } from './domain/device-credential';
export { hashToken, generateCredential, tokenMatchesHash } from './domain/device-credential';

// Ports
export type {
  DeviceRepository,
  DeviceCredentialRepository,
  NewDevice,
  AuditRecorder,
} from './application/ports';

// Application commands
export {
  provisionDevice,
  type ProvisionDeviceInput,
  type ProvisionDeviceDeps,
  type ProvisionDeviceResult,
} from './application/provision-device';
export {
  revokeDevice,
  quarantineDevice,
  reassignDevice,
  type DeviceCommandInput,
  type DeviceCommandDeps,
  type ReassignDeviceInput,
  type ReassignDeviceResult,
} from './application/manage-device';
export {
  authenticateDevice,
  type DeviceIdentity,
  type AuthenticateDeviceDeps,
} from './application/authenticate-device';

// Infrastructure (composition root only)
export {
  InMemoryDeviceRepository,
  InMemoryDeviceCredentialRepository,
} from './infrastructure/in-memory-device-repository';
export {
  SupabaseDeviceRepository,
  SupabaseDeviceCredentialRepository,
} from './infrastructure/supabase-device-repository';

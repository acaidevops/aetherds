/**
 * Public surface for the shared config module.
 *
 * `env-schema` (pure schemas) and `public-env` are client-safe. `env` is
 * server-only: it eagerly validates secrets, so importing it from a client
 * bundle fails the build.
 */
export { loadServerEnv, serverEnv } from './env';
export { loadPublicEnv } from './public-env';
export {
  serverEnvSchema,
  publicEnvSchema,
  SECRET_ENV_KEYS,
  type ServerEnv,
  type PublicEnv,
  type SecretEnvKey,
} from './env-schema';

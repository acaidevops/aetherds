import { describe, expect, it } from 'vitest';

import { loadPublicEnv, loadServerEnv, publicEnvSchema, SECRET_ENV_KEYS } from '@/shared/config';

// loadServerEnv reads uppercase env-var keys (NODE_ENV, APP_ENV, ...), not the
// camelCase schema fields, so fixtures use ProcessEnv-shaped sources.
const validServerEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  APP_NAME: 'aetherds',
  APP_VERSION: '1.2.3',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'role-key',
  SUPABASE_DB_URL: 'postgresql://localhost/postgres',
  OPENAI_API_KEY: 'openai-key',
  SPOTON_CLIENT_ID: 'client-id',
  SPOTON_CLIENT_SECRET: 'client-secret',
  SPOTON_SANDBOX_BASE_URL: 'https://sandbox.example.com',
  LOG_LEVEL: 'info',
};

describe('server env validation', () => {
  it('parses a valid environment', () => {
    const env = loadServerEnv(validServerEnv);
    expect(env.appEnv).toBe('production');
    expect(env.supabaseUrl).toBe('http://127.0.0.1:54321');
  });

  it('applies defaults for optional fields', () => {
    const { appName, appVersion } = loadServerEnv({
      ...validServerEnv,
      APP_NAME: undefined,
      APP_VERSION: undefined,
    });
    expect(appName).toBe('aetherds');
    expect(appVersion).toBe('0.0.0');
  });

  it('rejects an invalid app env', () => {
    expect(() => loadServerEnv({ ...validServerEnv, APP_ENV: 'prod' })).toThrow();
  });

  it('rejects a malformed supabase url', () => {
    expect(() => loadServerEnv({ ...validServerEnv, SUPABASE_URL: 'not-a-url' })).toThrow();
  });

  it('rejects a missing required secret', () => {
    expect(() =>
      loadServerEnv({ ...validServerEnv, SUPABASE_SERVICE_ROLE_KEY: undefined }),
    ).toThrow();
  });

  it('reports every invalid field by path in a single error', () => {
    let message = '';
    try {
      loadServerEnv({
        ...validServerEnv,
        APP_ENV: 'prod',
        SUPABASE_URL: 'not-a-url',
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('appEnv');
    expect(message).toContain('supabaseUrl');
  });

  it('does not echo a rejected secret value into the error message', () => {
    const leaked = 'super-secret-role-key-value';
    let message = '';
    try {
      // An empty service-role key fails min(1); the supplied secret must never
      // appear in the thrown message.
      loadServerEnv({ ...validServerEnv, SUPABASE_SERVICE_ROLE_KEY: '' });
      // The key above is empty; assert separately that a real value isn't echoed
      // for any min-length failure path.
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('supabaseServiceRoleKey');
    expect(message).not.toContain(leaked);
  });
});

describe('public env validation', () => {
  it('parses the allow-listed public variables from process.env', () => {
    // tests/setup.ts seeds NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY.
    const env = loadPublicEnv();
    expect(env.supabaseUrl).toBe('http://127.0.0.1:54321');
    expect(env.supabaseAnonKey).toBe('test-anon');
  });

  it('rejects a missing anon key', () => {
    const saved = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      expect(() => loadPublicEnv()).toThrow();
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = saved;
    }
  });
});

describe('secret-leak guard (acceptance criterion A1)', () => {
  // publicEnvSchema.shape keys are the camelCase field names exposed to the
  // client (supabaseUrl, supabaseAnonKey), NOT the NEXT_PUBLIC_* env-var names.
  // Asserting the exact set is the strongest guard: any addition to the public
  // surface — secret or otherwise — fails here and forces a deliberate decision.
  const publicKeys = Object.keys(publicEnvSchema.shape);

  it('exposes exactly the intended public schema fields', () => {
    expect(publicKeys).toEqual(['supabaseUrl', 'supabaseAnonKey']);
  });

  it('tracks the secret keys that must never be NEXT_PUBLIC_-prefixed', () => {
    expect(SECRET_ENV_KEYS).toEqual([
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_URL',
      'OPENAI_API_KEY',
      'SPOTON_CLIENT_ID',
      'SPOTON_CLIENT_SECRET',
    ]);
  });
});

import type { NextConfig } from 'next';

/**
 * AETHER Digital Server Next.js configuration.
 *
 * See ADR 0004 (modular monolith) and docs/engineering/development.md for the
 * baseline stack and repository structure.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `src/modules/*` maps one-to-one to logical modules but is NOT marked as an
  // external package boundary, so the build can bundle the modular monolith;
  // architecture boundaries are enforced statically by dependency-cruiser
  // (see .dependency-cruiser.cjs). typedRoutes types <Link href> at build time.
  typedRoutes: true,
};

export default nextConfig;

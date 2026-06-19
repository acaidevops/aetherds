import type { ReactNode } from 'react';

/**
 * Guest surface shell (route group `(guest)`).
 *
 * Placeholder for A1 scaffolding — the guest design system and shell land in
 * epic E1 (docs/delivery/backlog.md). Kept intentionally free of design tokens
 * so E1 owns the visual language.
 */
export default function GuestLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return <main>{children}</main>;
}

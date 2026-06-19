import type { ReactNode } from 'react';

/**
 * Admin surface shell (route group `(admin)`).
 *
 * Placeholder for A1 scaffolding — menu enrichment administration, approvals,
 * and publication land in later epics. Free of design tokens until that work.
 */
export default function AdminLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return <main>{children}</main>;
}

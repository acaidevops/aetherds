import type { ReactNode } from 'react';

/**
 * Staff surface shell (route group `(staff)`).
 *
 * Placeholder for A1 scaffolding — server/manager screens (live floor,
 * dashboards, service-request ownership) land in epic H. Free of design tokens
 * until that epic.
 */
export default function StaffLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return <main>{children}</main>;
}

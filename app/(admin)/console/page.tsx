import type { ReactNode } from 'react';

/**
 * Admin placeholder (`/console`). Menu administration and enrichment workflows
 * arrive in later epics; this route exists only to establish the admin surface.
 */
export default function AdminConsolePage(): ReactNode {
  return (
    <section>
      <h1>Admin</h1>
      <p>The administration console is under construction.</p>
    </section>
  );
}

import type { ReactNode } from 'react';

/**
 * Guest home placeholder (`/`). Real guest flows — menu browse, guided
 * discovery, recommendations, cart — arrive in epics E and F. Provided only to
 * prove the guest route group renders end-to-end.
 */
export default function GuestHomePage(): ReactNode {
  return (
    <section>
      <h1>AETHER</h1>
      <p>The guest experience is under construction.</p>
      <p>
        Sample API: <a href="/api/v1/operations/system-health">/api/v1/operations/system-health</a>
      </p>
    </section>
  );
}

import type { ReactNode } from 'react';

/**
 * Guest experience placeholder (`/experience`). Real guest flows — menu browse,
 * guided discovery, recommendations, cart — arrive in epics E and F. The public
 * marketing landing now owns `/`; this route hosts the in-restaurant guest PWA.
 */
export default function GuestExperiencePage(): ReactNode {
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

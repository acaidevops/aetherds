import type { ReactNode } from 'react';

import { EmptyState } from '../../_ui/states';

/**
 * Guided-discovery placeholder (`/experience/guide`). Dining intents, allergy
 * and preference questions, and curated recommendations arrive in epic E2; this
 * route exists so the Home entry has a real destination.
 */
export default function GuidePage(): ReactNode {
  return (
    <div className="gds-stack">
      <h1>Guide my experience</h1>
      <EmptyState
        title="Guided discovery is coming soon"
        description="We’ll ask a few questions — intent, allergies, preferences — and shape a meal around you (epic E2)."
      />
    </div>
  );
}

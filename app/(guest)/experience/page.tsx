import type { ReactNode } from 'react';

import { InteractiveCard } from '../_ui/card';
import { BellIcon, MenuIcon } from '../_ui/icons';
import { Badge } from '../_ui/badge';

/**
 * Guest Home (`/experience`).
 *
 * The three home routes from experience-spec.md §3 — Guide my experience,
 * Browse the menu, Call my server — presented with the E1 design system. This
 * establishes the shell + visual language; the guided-discovery, menu, and
 * service-request flows behind these entries arrive in E2/E5/F and the
 * service-requests epic.
 */
export default function GuestHomePage(): ReactNode {
  return (
    <div className="gds-stack">
      <div className="gds-stack gds-stack--tight">
        <span className="gds-eyebrow">Welcome</span>
        <h1>Good evening.</h1>
        <p className="gds-lede">
          Explore the menu at your pace, let us guide a meal to your taste, or call your server
          whenever you need them.
        </p>
      </div>

      <div className="gds-home-grid">
        <InteractiveCard>
          <Badge tone="accent">Guided</Badge>
          <h2 className="gds-home-card__title">Guide my experience</h2>
          <p>Answer a few quick questions and we’ll shape a meal around you.</p>
        </InteractiveCard>

        <InteractiveCard>
          <span className="gds-home-card__icon">
            <MenuIcon width={24} height={24} />
          </span>
          <h2 className="gds-home-card__title">Browse the menu</h2>
          <p>See every dish with photos, details, and pairings.</p>
        </InteractiveCard>

        <InteractiveCard>
          <span className="gds-home-card__icon">
            <BellIcon width={24} height={24} />
          </span>
          <h2 className="gds-home-card__title">Call my server</h2>
          <p>Water, the check, or a hand — your server is a tap away.</p>
        </InteractiveCard>
      </div>
    </div>
  );
}

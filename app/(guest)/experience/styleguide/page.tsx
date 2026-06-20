import type { ReactNode } from 'react';

import { Badge } from '../../_ui/badge';
import { Button } from '../../_ui/button';
import { Card } from '../../_ui/card';
import { EmptyState, ErrorState } from '../../_ui/states';
import { Skeleton } from '../../_ui/skeleton';
import { Spinner } from '../../_ui/spinner';

/**
 * Living styleguide (`/experience/styleguide`).
 *
 * Renders every guest primitive across its documented states (E1 acceptance:
 * default, hover, focus, active, disabled, loading, error, empty, skeleton).
 * It backs /DESIGN.md as runnable verification evidence; hover/focus/active are
 * inherently interactive, so they are exercised live here rather than depicted.
 */
export default function StyleguidePage(): ReactNode {
  return (
    <div className="gds-stack">
      <div className="gds-stack gds-stack--tight">
        <span className="gds-eyebrow">Design system</span>
        <h1>Guest styleguide</h1>
        <p className="gds-lede">
          The implemented tokens and components. Tab through to verify focus rings; hover and press
          to verify interaction states.
        </p>
      </div>

      <Section title="Buttons — variants">
        <div className="gds-sg-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Section>

      <Section title="Buttons — states">
        <div className="gds-sg-row">
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="secondary" loading>
            Saving
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="gds-sg-row">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge withDot>Reviewing</Badge>
        </div>
      </Section>

      <Section title="Loading — spinner & skeleton">
        <div className="gds-sg-row">
          <Spinner label="Loading menu" />
        </div>
        <Card>
          <div className="gds-stack gds-stack--tight">
            <Skeleton width="40%" height="1.25rem" />
            <Skeleton width="100%" height="0.9rem" />
            <Skeleton width="80%" height="0.9rem" />
            <Skeleton width={120} height={120} radius="var(--gds-radius-md)" />
          </div>
        </Card>
      </Section>

      <Section title="Empty state">
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on a dish to keep it here for this visit."
          action={<Button variant="secondary">Browse the menu</Button>}
        />
      </Section>

      <Section title="Error state">
        <ErrorState action={<Button variant="secondary">Try again</Button>} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className="gds-stack gds-stack--tight">
      <h2 className="gds-sg-heading">{title}</h2>
      {children}
    </section>
  );
}

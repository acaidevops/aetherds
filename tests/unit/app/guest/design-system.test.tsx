import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Badge, CountBadge } from '@/app/(guest)/_ui/badge';
import { Button } from '@/app/(guest)/_ui/button';
import { Card, InteractiveCard } from '@/app/(guest)/_ui/card';
import { EmptyState, ErrorState } from '@/app/(guest)/_ui/states';
import { Spinner } from '@/app/(guest)/_ui/spinner';
import { GuestShell } from '@/app/(guest)/_shell/guest-shell';
import GuestHomePage from '@/app/(guest)/experience/page';

/**
 * Guest design-system primitives are server components with no async data, so
 * they render to static markup and can be asserted directly. These guard the
 * accessibility and state contracts E1 promises.
 */
describe('Button', () => {
  it('applies the variant class', () => {
    expect(renderToStaticMarkup(<Button variant="primary">Go</Button>)).toContain(
      'gds-btn--primary',
    );
  });

  it('loading disables the button, marks aria-busy, and shows a spinner', () => {
    const html = renderToStaticMarkup(
      <Button variant="primary" loading>
        Save
      </Button>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled');
    expect(html).toContain('gds-spinner');
  });

  it('defaults to type=button so it never submits a form by accident', () => {
    expect(renderToStaticMarkup(<Button>Ok</Button>)).toContain('type="button"');
  });
});

describe('Card', () => {
  it('renders an interactive card as a real button for keyboard access', () => {
    const html = renderToStaticMarkup(<InteractiveCard>Pick</InteractiveCard>);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('gds-card--interactive');
  });

  it('renders a static card as a div', () => {
    expect(renderToStaticMarkup(<Card>Plain</Card>)).toMatch(/^<div/);
  });
});

describe('Badge / CountBadge', () => {
  it('renders nothing when the count is zero', () => {
    expect(renderToStaticMarkup(<CountBadge count={0} label="items" />)).toBe('');
  });

  it('caps the count at 99+ and labels it for screen readers', () => {
    const html = renderToStaticMarkup(<CountBadge count={150} label="items in cart" />);
    expect(html).toContain('99+');
    expect(html).toContain('aria-label="150 items in cart"');
  });

  it('does not convey tone by color alone (dot is available)', () => {
    expect(renderToStaticMarkup(<Badge withDot>Reviewing</Badge>)).toContain('gds-badge__dot');
  });
});

describe('Spinner / states', () => {
  it('spinner exposes a status role and a label', () => {
    const html = renderToStaticMarkup(<Spinner label="Loading menu" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading menu');
  });

  it('error state is announced via role=alert', () => {
    expect(renderToStaticMarkup(<ErrorState />)).toContain('role="alert"');
  });

  it('empty state renders title and description', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No favorites yet" description="Tap a heart." />,
    );
    expect(html).toContain('No favorites yet');
    expect(html).toContain('Tap a heart.');
  });
});

describe('GuestShell', () => {
  const html = renderToStaticMarkup(
    <GuestShell active="menu" cartCount={2} cartSubtotalLabel="$24.00">
      <p>content</p>
    </GuestShell>,
  );

  it('renders the four persistent controls', () => {
    for (const label of ['Home', 'Menu', 'Cart', 'Call server']) {
      expect(html).toContain(label);
    }
  });

  it('marks the active item with aria-current and surfaces cart figures', () => {
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('$24.00');
    expect(html).toContain('2 items in cart');
  });

  it('labels the navigation landmark', () => {
    expect(html).toContain('aria-label="Guest navigation"');
  });
});

describe('Guest home', () => {
  it('presents the three home routes', () => {
    const html = renderToStaticMarkup(<GuestHomePage />);
    expect(html).toContain('Guide my experience');
    expect(html).toContain('Browse the menu');
    expect(html).toContain('Call my server');
  });
});

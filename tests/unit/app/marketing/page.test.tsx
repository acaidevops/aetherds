import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from '@/app/(marketing)/page';
import GuestExperiencePage from '@/app/(guest)/experience/page';

/**
 * The marketing landing page is a server component with no async data, so it can
 * be rendered to static markup and asserted directly — no DOM library needed.
 * These tests guard the copy and links that matter to the page's audiences
 * (investors and SpotOn's partner reviewers) and the authority boundaries the
 * product is contractually held to (README "Non-negotiable boundaries").
 */
describe('marketing landing page', () => {
  const html = renderToStaticMarkup(<LandingPage />);

  it('positions AETHER as a layer over SpotOn, not a POS', () => {
    expect(html).toContain('Not a point of sale');
    expect(html).toContain('system of record');
  });

  it('states the human-approval and SpotOn-authority boundaries', () => {
    expect(html).toContain('A human approves every order');
    expect(html).toContain('SpotOn stays the system of record');
  });

  it('exposes a single contact email and the repository link', () => {
    const matches = html.match(/auraconnectai@gmail\.com/g) ?? [];
    // mailto in the CTA + mailto and visible text in the footer.
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('mailto:auraconnectai@gmail.com');
    expect(html).toContain('https://github.com/acaidevops/aetherds');
  });

  it('flags pilot details as provisional rather than committed', () => {
    expect(html).toContain('provisional');
    expect(html).toContain('AnTeNa');
  });

  it('does not leak inline style attributes (styles live in marketing.css)', () => {
    expect(html).not.toContain('style=');
  });
});

describe('relocated guest experience page', () => {
  it('renders at /experience as a placeholder', () => {
    const html = renderToStaticMarkup(<GuestExperiencePage />);
    expect(html).toContain('AETHER');
    expect(html).toContain('under construction');
  });
});

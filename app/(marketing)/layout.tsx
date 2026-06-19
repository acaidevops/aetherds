import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Inter } from 'next/font/google';

import './marketing.css';

/**
 * Public marketing surface (route group `(marketing)`, serves `/`).
 *
 * This is the only public, unauthenticated brochure surface. It is deliberately
 * isolated from the product design system: it imports its own scoped stylesheet
 * (`marketing.css`) and fonts so it never pre-empts the guest/staff token work
 * reserved for epic E1 in `app/globals.css`.
 *
 * Copy is held to the same authority boundaries as the product (ADR 0001/0002,
 * README "Non-negotiable boundaries"): AETHER is presented as an optional layer
 * over SpotOn, never as a POS or an autonomous agent.
 */
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--mkt-font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--mkt-font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AETHER — AI-assisted digital hospitality server',
  description:
    'AETHER is an optional digital hospitality layer for seated dining. It guides guests and speeds service while a human server approves every order and SpotOn stays the system of record.',
  openGraph: {
    title: 'AETHER — AI-assisted digital hospitality server',
    description:
      'An optional digital hospitality layer for seated dining. Human servers stay in control; SpotOn stays authoritative.',
    type: 'website',
  },
};

export default function MarketingLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return <div className={`mkt ${display.variable} ${body.variable}`}>{children}</div>;
}

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Inter } from 'next/font/google';

import './guest.css';
import { GuestShell } from './_shell/guest-shell';

/**
 * Guest surface shell (route group `(guest)`, epic E1).
 *
 * Applies the dark guest THEME (`.gds`) and design-system fonts, then wraps
 * every guest route in the persistent shell (top mark + bottom nav). Tokens
 * live in app/globals.css; component styles in guest.css. The managed-iPad PWA
 * runs here, so the viewport pins a dark theme color and disables zoom-jank
 * while still honoring text scaling.
 */

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-gds-sans',
  display: 'swap',
});

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-gds-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AETHER',
  description: 'Your table, guided. Discover dishes and call your server anytime.',
};

export const viewport: Viewport = {
  themeColor: '#14110d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function GuestLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <div className={`gds ${sans.variable} ${display.variable}`}>
      <GuestShell>{children}</GuestShell>
    </div>
  );
}

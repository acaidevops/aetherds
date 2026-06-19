import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'AETHER Digital Server',
  description: 'AI-assisted hospitality table experience.',
};

/**
 * Root layout shared by every surface (guest, staff, admin). Per ADR 0004 this
 * is a single Next.js application; route groups separate the surfaces without
 * splitting the deployable.
 */
export default function RootLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

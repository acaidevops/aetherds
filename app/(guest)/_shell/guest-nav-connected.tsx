'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { GuestNav, type GuestNavKey } from './guest-nav';

/**
 * Connects GuestNav to the current route. Kept as a thin client boundary so the
 * rest of the shell stays server-rendered and GuestNav stays presentational and
 * testable. Cart figures will be sourced from cart/session state in E2/F1; for
 * now they default through GuestNav.
 */
function activeFromPath(pathname: string | null): GuestNavKey | undefined {
  if (!pathname) return undefined;
  if (pathname === '/experience') return 'home';
  if (pathname.startsWith('/experience/menu')) return 'menu';
  if (pathname.startsWith('/experience/cart')) return 'cart';
  if (pathname.startsWith('/experience/call')) return 'call';
  return undefined;
}

export function GuestNavConnected({
  cartCount,
  cartSubtotalLabel,
}: {
  readonly cartCount?: number;
  readonly cartSubtotalLabel?: string;
}): ReactNode {
  const active = activeFromPath(usePathname());
  return <GuestNav active={active} cartCount={cartCount} cartSubtotalLabel={cartSubtotalLabel} />;
}

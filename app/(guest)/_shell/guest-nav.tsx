import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { BellIcon, CartIcon, HomeIcon, MenuIcon } from '../_ui/icons';
import { CountBadge } from '../_ui/badge';

/**
 * GuestNav — the persistent bottom navigation (experience-spec.md §3),
 * presentational and server-renderable so it stays trivially testable. Items
 * are real <Link>s to their routes; the active item is passed in (derived from
 * the current route by GuestNavConnected). Cart count + estimated subtotal ride
 * the Cart item; prices stay visually secondary.
 */

export type GuestNavKey = 'home' | 'menu' | 'cart' | 'call';

export interface GuestNavProps {
  readonly active?: GuestNavKey;
  readonly cartCount?: number;
  readonly cartSubtotalLabel?: string;
}

export function GuestNav({
  active,
  cartCount = 0,
  cartSubtotalLabel = '$0.00',
}: GuestNavProps): ReactNode {
  return (
    <nav className="gds-nav" aria-label="Guest navigation">
      <NavLink href="/experience" label="Home" current={active === 'home'}>
        <HomeIcon className="gds-nav__icon" />
      </NavLink>
      <NavLink href="/experience/menu" label="Menu" current={active === 'menu'}>
        <MenuIcon className="gds-nav__icon" />
      </NavLink>
      <NavLink
        href="/experience/cart"
        label="Cart"
        current={active === 'cart'}
        sublabel={cartSubtotalLabel}
      >
        <span className="gds-nav__cart">
          <CartIcon className="gds-nav__icon" />
          <CountBadge count={cartCount} label="items in cart" />
        </span>
      </NavLink>
      <NavLink href="/experience/call" label="Call server" current={active === 'call'}>
        <BellIcon className="gds-nav__icon" />
      </NavLink>
    </nav>
  );
}

function NavLink({
  href,
  label,
  current,
  sublabel,
  children,
}: {
  readonly href: Route;
  readonly label: string;
  readonly current: boolean;
  readonly sublabel?: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Link href={href} className="gds-nav__item" aria-current={current ? 'page' : undefined}>
      {children}
      <span>{label}</span>
      {sublabel && <span className="gds-nav__subtotal">{sublabel}</span>}
    </Link>
  );
}

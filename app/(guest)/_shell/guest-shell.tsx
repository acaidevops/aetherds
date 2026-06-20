import type { ReactNode } from 'react';

import { AetherGlyph, BellIcon, CartIcon, HomeIcon, MenuIcon } from '../_ui/icons';
import { CountBadge } from '../_ui/badge';

/**
 * GuestShell — the persistent guest chrome (epic E1; experience-spec.md §3).
 *
 * A sticky top bar carries the abstract AETHER mark; a sticky bottom bar
 * carries the four persistent controls — Home, Menu, Cart (count + estimated
 * subtotal), Call server — at tablet-comfortable touch targets. The shell is
 * presentational: cart figures and the active item arrive as props now, and
 * from session/cart state once E2/F1 wire them. Behaviour (navigation, calling
 * a server) is intentionally deferred to those epics; here the controls are
 * real, focusable buttons with correct semantics.
 */

export type GuestNavKey = 'home' | 'menu' | 'cart' | 'call';

export interface GuestShellProps {
  readonly children: ReactNode;
  readonly active?: GuestNavKey;
  readonly cartCount?: number;
  /** Pre-formatted estimated subtotal, e.g. "$24.00". Prices stay secondary. */
  readonly cartSubtotalLabel?: string;
}

export function GuestShell({
  children,
  active = 'home',
  cartCount = 0,
  cartSubtotalLabel = '$0.00',
}: GuestShellProps): ReactNode {
  return (
    <div className="gds-shell">
      <header className="gds-topbar">
        <span className="gds-mark">
          <AetherGlyph className="gds-mark__glyph" />
          Aether
        </span>
      </header>

      <main className="gds-content">{children}</main>

      <nav className="gds-nav" aria-label="Guest navigation">
        <NavButton label="Home" current={active === 'home'}>
          <HomeIcon className="gds-nav__icon" />
        </NavButton>
        <NavButton label="Menu" current={active === 'menu'}>
          <MenuIcon className="gds-nav__icon" />
        </NavButton>
        <NavButton label="Cart" current={active === 'cart'} sublabel={cartSubtotalLabel}>
          <span className="gds-nav__cart">
            <CartIcon className="gds-nav__icon" />
            <CountBadge count={cartCount} label="items in cart" />
          </span>
        </NavButton>
        <NavButton label="Call server" current={active === 'call'}>
          <BellIcon className="gds-nav__icon" />
        </NavButton>
      </nav>
    </div>
  );
}

function NavButton({
  label,
  current,
  className,
  sublabel,
  children,
}: {
  readonly label: string;
  readonly current: boolean;
  readonly className?: string;
  readonly sublabel?: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      className={['gds-nav__item', className ?? ''].filter(Boolean).join(' ')}
      aria-current={current ? 'page' : undefined}
    >
      {children}
      <span>{label}</span>
      {sublabel && <span className="gds-nav__subtotal">{sublabel}</span>}
    </button>
  );
}

import type { ReactNode } from 'react';

import { EmptyState } from '../../_ui/states';
import { CartIcon } from '../../_ui/icons';

/**
 * Cart placeholder (`/experience/cart`). Cart building, diner/seat assignment,
 * and final review arrive in epic F; this route exists so the persistent shell
 * has a real destination and can reflect the active state.
 */
export default function CartPage(): ReactNode {
  return (
    <div className="gds-stack">
      <h1>Cart</h1>
      <EmptyState
        icon={<CartIcon width={40} height={40} />}
        title="Your cart is empty"
        description="Add dishes from the menu. Cart and order review arrive soon (epic F)."
      />
    </div>
  );
}

import type { ReactNode } from 'react';

import { EmptyState } from '../../_ui/states';
import { MenuIcon } from '../../_ui/icons';

/**
 * Menu placeholder (`/experience/menu`). Image-led browsing, detail, compare,
 * and favorites arrive in E5; this route exists so the persistent shell has a
 * real destination and can reflect the active state.
 */
export default function MenuPage(): ReactNode {
  return (
    <div className="gds-stack">
      <h1>Menu</h1>
      <EmptyState
        icon={<MenuIcon width={40} height={40} />}
        title="The menu is on its way"
        description="Image-led browsing, dish detail, and pairings arrive soon (epic E5)."
      />
    </div>
  );
}

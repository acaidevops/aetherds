import type { ReactNode } from 'react';

import { AetherGlyph } from '../_ui/icons';

/**
 * GuestShell — the persistent guest chrome (epic E1; experience-spec.md §3).
 *
 * Presentational and server-rendered: a sticky top bar with the abstract AETHER
 * mark, the route content, and a `nav` slot for the persistent bottom bar. The
 * nav is injected (GuestNavConnected) so route-derived active state lives behind
 * a thin client boundary while the shell itself stays server-side.
 */
export function GuestShell({
  children,
  nav,
}: {
  readonly children: ReactNode;
  readonly nav: ReactNode;
}): ReactNode {
  return (
    <div className="gds-shell">
      <header className="gds-topbar">
        <span className="gds-mark">
          <AetherGlyph className="gds-mark__glyph" />
          Aether
        </span>
      </header>

      <main className="gds-content">{children}</main>

      {nav}
    </div>
  );
}

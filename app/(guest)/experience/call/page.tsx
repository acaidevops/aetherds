import type { ReactNode } from 'react';

import { EmptyState } from '../../_ui/states';
import { BellIcon } from '../../_ui/icons';

/**
 * Call-server placeholder (`/experience/call`). The service-request options
 * (water, check, server, and more) arrive in the service-requests epic; this
 * route exists so the persistent shell has a real destination and can reflect
 * the active state.
 */
export default function CallServerPage(): ReactNode {
  return (
    <div className="gds-stack">
      <h1>Call your server</h1>
      <EmptyState
        icon={<BellIcon width={40} height={40} />}
        title="Service requests are coming soon"
        description="Water, the check, and more will be a tap away (service-requests epic). In the meantime, please signal a nearby server."
      />
    </div>
  );
}

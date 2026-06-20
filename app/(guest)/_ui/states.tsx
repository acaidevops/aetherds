import type { ReactNode } from 'react';

import { AlertIcon, InboxIcon } from './icons';

/**
 * EmptyState and ErrorState — the standardized "nothing here yet" and
 * "something went wrong" blocks (E1 acceptance: empty + error states).
 *
 * Error copy follows the hospitality voice (experience-spec.md §7/8): it
 * explains and offers a human path, and never makes a safety guarantee. An
 * error renders with role=alert so it is announced.
 */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
}): ReactNode {
  return (
    <div className="gds-state">
      <span className="gds-state__icon">{icon ?? <InboxIcon width={40} height={40} />}</span>
      <p className="gds-state__title">{title}</p>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'We hit a snag',
  description = 'Please try again in a moment, or ask your server for help.',
  action,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
}): ReactNode {
  return (
    <div className="gds-state gds-state--error" role="alert">
      <span className="gds-state__icon">
        <AlertIcon width={40} height={40} />
      </span>
      <p className="gds-state__title">{title}</p>
      <p>{description}</p>
      {action}
    </div>
  );
}

import type { ReactNode } from 'react';

/**
 * Spinner — indeterminate loading. Announced via role=status + an sr-only
 * label so screen-reader users learn that work is in progress (no color-only
 * meaning). Respects reduced motion (animation stopped in guest.css).
 */
export function Spinner({
  className,
  label = 'Loading',
}: {
  readonly className?: string;
  readonly label?: string;
}): ReactNode {
  return (
    <span role="status" className={['gds-spinner', className ?? ''].filter(Boolean).join(' ')}>
      <span className="gds-sr-only">{label}</span>
    </span>
  );
}

import type { ReactNode } from 'react';

/**
 * Badge — compact status/label. Status tone is conveyed by an optional dot AND
 * text, never color alone (WCAG 2.2 AA, experience-spec.md §2). `CountBadge`
 * is the numeric overlay used on the cart nav item.
 */

export type BadgeTone = 'neutral' | 'accent';

export function Badge({
  tone = 'neutral',
  withDot = false,
  children,
}: {
  readonly tone?: BadgeTone;
  readonly withDot?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const cls = ['gds-badge', tone === 'accent' ? 'gds-badge--accent' : ''].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {withDot && <span className="gds-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function CountBadge({
  count,
  label,
}: {
  readonly count: number;
  readonly label: string;
}): ReactNode {
  if (count <= 0) return null;
  return (
    <span className="gds-badge gds-badge--count" aria-label={`${count} ${label}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

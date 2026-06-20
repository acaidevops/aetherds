import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './spinner';

/**
 * Button — the primary guest action primitive.
 *
 * States covered (E1 acceptance): default, hover, focus (visible ring),
 * active, disabled, and loading. Loading sets `aria-busy` and disables
 * interaction while keeping the layout stable (label is hidden, spinner
 * overlaid). Targets meet the WCAG 2.2 AA touch floor via the `.gds-btn` token.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly block?: boolean;
  readonly loading?: boolean;
  readonly children: ReactNode;
}

export function Button({
  variant = 'secondary',
  block = false,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  const classes = [
    'gds-btn',
    `gds-btn--${variant}`,
    block ? 'gds-btn--block' : '',
    loading ? 'gds-btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="gds-btn__spinner" label="Working" />}
      {children}
    </button>
  );
}

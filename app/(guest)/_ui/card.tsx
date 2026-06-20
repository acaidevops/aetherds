import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/**
 * Card — a surface container. `Card` is a static region; `InteractiveCard` is a
 * real <button> so keyboard focus, Enter/Space activation, and the focus ring
 * come for free (no div-with-onClick anti-pattern). States: default, hover,
 * focus, active, disabled.
 */

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }): ReactNode {
  return (
    <div className={['gds-card', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function InteractiveCard({
  className,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly children: ReactNode }): ReactNode {
  return (
    <button
      type={type}
      className={['gds-card', 'gds-card--interactive', className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

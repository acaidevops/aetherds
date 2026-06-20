import type { CSSProperties, ReactNode } from 'react';

/**
 * Skeleton — content placeholder during loading. Decorative and hidden from the
 * accessibility tree (the live region announcing load lives elsewhere). Width,
 * height, and radius are passed as explicit dimensions so callers compose
 * realistic placeholders; the shimmer respects reduced motion (guest.css).
 */
export function Skeleton({
  width = '100%',
  height = '1rem',
  radius,
  className,
}: {
  readonly width?: string | number;
  readonly height?: string | number;
  readonly radius?: string | number;
  readonly className?: string;
}): ReactNode {
  const style: CSSProperties = {
    width,
    height,
    ...(radius !== undefined ? { borderRadius: radius } : {}),
  };
  return (
    <span
      className={['gds-skeleton', className ?? ''].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

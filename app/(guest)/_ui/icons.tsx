import type { ReactNode, SVGProps } from 'react';

/**
 * Minimal line-icon set for the guest shell. Abstract and restrained per
 * experience-spec.md §1 (no realistic human avatar). Icons are decorative by
 * default (aria-hidden); when an icon is the only label, the parent control
 * supplies an accessible name.
 */

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M3 10.5 12 4l9 6.5" />
    <path d="M5 9.5V20h14V9.5" />
  </Svg>
);

export const MenuIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
);

export const CartIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 8H6" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </Svg>
);

export const BellIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Svg>
);

export const AlertIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17.5v.01" />
  </Svg>
);

export const InboxIcon = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <Svg {...p}>
    <path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" />
    <path d="M4 13h4l1.5 2.5h5L16 13h4" />
  </Svg>
);

/** Abstract AETHER mark — concentric arcs, no anthropomorphism. */
export const AetherGlyph = (p: SVGProps<SVGSVGElement>): ReactNode => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.4} opacity={0.45} />
    <path d="M12 3a9 9 0 0 1 0 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
  </svg>
);

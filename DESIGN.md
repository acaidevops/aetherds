# AETHER Design System (Guest)

This document describes the **implemented** guest design system (epic E1). It is
generated from the real tokens and components, not an aspirational spec — when
the code changes, update this file to match.

- **Tokens:** [`app/globals.css`](app/globals.css) (`:root`, `--gds-*`)
- **Theme + component styles:** [`app/(guest)/guest.css`](app/%28guest%29/guest.css) (scoped to `.gds`)
- **Components:** [`app/(guest)/_ui/`](app/%28guest%29/_ui)
- **Shell:** [`app/(guest)/_shell/guest-shell.tsx`](app/%28guest%29/_shell/guest-shell.tsx)
- **Live styleguide:** `/experience/styleguide`

## Direction

Dark, modern, minimal, warm, editorial — suited to evening dining and never
neon sci-fi (ux/experience-spec.md §1, PRODUCT.md). Prices are transparent but
visually secondary to dish understanding. Hospitality stays one tap away.

## Tokens

Defined once at `:root` so they are app-wide and reusable; the dark theme that
consumes them is applied only under `.gds`, so the marketing and staff/admin
surfaces are unaffected.

| Group | Tokens |
|---|---|
| Color — surface | `--gds-bg`, `--gds-surface`, `--gds-surface-2`, `--gds-overlay` |
| Color — text | `--gds-text`, `--gds-text-muted`, `--gds-text-faint`, `--gds-on-accent` |
| Color — accent | `--gds-accent`, `--gds-accent-strong`, `--gds-accent-dim` |
| Color — status | `--gds-success`, `--gds-warning`, `--gds-danger`, `--gds-danger-dim` |
| Lines | `--gds-line`, `--gds-line-strong` |
| Space (4px base) | `--gds-space-1` … `--gds-space-8` |
| Radius | `--gds-radius-sm/md/lg/pill` |
| Type scale | `--gds-text-xs` … `--gds-text-3xl` |
| Motion | `--gds-dur-fast/dur/dur-slow`, `--gds-ease` |
| Accessibility | `--gds-touch-min` (44px), `--gds-touch-comfort` (52px), `--gds-focus-ring` |
| Elevation | `--gds-shadow-1`, `--gds-shadow-2` |

Fonts are bound on the `.gds` wrapper via `next/font`: **Inter**
(`--font-gds-sans`) for UI/body, **Fraunces** (`--font-gds-display`) for
editorial headings.

## Accessibility (WCAG 2.2 AA)

- Interactive controls meet the **44px** touch floor (`--gds-touch-min`); nav
  uses the 52px comfort target.
- Every focusable element shows a visible **focus ring** via `:focus-visible`.
- **Status never relies on color alone** — badges/states pair color with an
  icon and text.
- **Reduced motion**: the `:root` motion tokens collapse under
  `prefers-reduced-motion`, and looping animations (shimmer, spinner) stop —
  implemented without `!important`.
- Loading uses `role=status`; errors use `role=alert`.
- Text scaling is honored (rem-based type); the iPad viewport allows zoom.

## Responsive

Tablet-first for the managed iPad. Content is centered with a max width; the
persistent nav is a sticky bottom bar with `safe-area-inset` padding. The home
grid is single-column on phones and three-up from 768px.

## Components & states

Documented states per E1: **default, hover, focus, active, disabled, loading,
error, empty, skeleton**. Verify the interactive ones live at
`/experience/styleguide`.

| Component | File | States / variants |
|---|---|---|
| `Button` | `_ui/button.tsx` | variants: primary / secondary / ghost / danger; states: default, hover, focus, active, disabled, loading (`aria-busy`, spinner), block |
| `Card` / `InteractiveCard` | `_ui/card.tsx` | static surface; interactive is a real `<button>` with hover/focus/active |
| `Badge` / `CountBadge` | `_ui/badge.tsx` | neutral / accent, optional dot; count hides at 0, caps at `99+` |
| `Skeleton` | `_ui/skeleton.tsx` | shimmer placeholder; sized via props; `aria-hidden` |
| `Spinner` | `_ui/spinner.tsx` | indeterminate; `role=status` + sr-only label |
| `EmptyState` | `_ui/states.tsx` | icon + title + description + optional action |
| `ErrorState` | `_ui/states.tsx` | `role=alert`; hospitality voice; never a safety guarantee |

## Shell

`GuestShell` provides the persistent chrome (experience-spec.md §3): a top bar
with the abstract AETHER mark, and a bottom nav with **Home, Menu, Cart (count +
estimated subtotal), Call server**. The controls are real `<Link>`s to their
routes, and the active item is derived from the current path behind a thin
client boundary (`GuestNavConnected`), keeping the rest of the shell server-
rendered. The Menu/Cart/Call/Guide destinations are honest placeholders today;
their full flows arrive in E2/E5/F and the service-requests epic. Cart count and
subtotal are props until cart/session state wires them in E2/F1.

## Boundaries

The guest system is intentionally isolated: tokens are global, but the theme
and all `.gds-*` styles are scoped to the guest shell. It does not restyle the
marketing landing (`.mkt`) or the staff/admin placeholders.

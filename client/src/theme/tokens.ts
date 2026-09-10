/**
 * Design tokens.
 *
 * Every colour, radius and spacing step is named here once, so a change of
 * palette is a change to this file alone.
 */

/**
 * The grey scale from the Material-UI dashboard template. The greys carry a
 * blue cast, `hsl(220, ...)`, which is what keeps the surfaces cool beside the
 * Aarhus navy.
 */
export const grey = {
  50: 'hsl(220, 35%, 97%)',
  100: 'hsl(220, 30%, 94%)',
  200: 'hsl(220, 20%, 88%)',
  300: 'hsl(220, 20%, 80%)',
  400: 'hsl(220, 20%, 65%)',
  500: 'hsl(220, 20%, 42%)',
  600: 'hsl(220, 20%, 35%)',
  700: 'hsl(220, 20%, 25%)',
  800: 'hsl(220, 30%, 6%)',
  900: 'hsl(220, 35%, 3%)',
} as const;

export const white = '#ffffff';

/** Semantic colours. A status keeps its meaning wherever it appears. */
export const status = {
  success: '#1f7a4d',
  warning: '#a35a00',
  error: '#b3261e',
  info: '#0b5fa5',
} as const;

/** Corner radius in pixels. One value, as the template uses. */
export const radius = 8;

/** Spacing step in pixels. MUI multiplies it by the number in `sx={{ p: 2 }}`. */
export const spacingStep = 8;

/** Surfaces are separated by a border, so shadow is left for what floats. */
export const overlayShadow =
  '0 8px 24px -4px rgba(22, 26, 32, 0.12), 0 2px 6px -2px rgba(22, 26, 32, 0.08)';

/** Smallest touch target in pixels, from the WCAG target size guidance. */
export const minTouchTarget = 44;

interface Brand {
  readonly primary: string;
  /** Hover, and text on a light tint. */
  readonly primaryDark: string;
  /** Selected rows and subtle fills. */
  readonly primaryTint: string;
  readonly accent: string;
  readonly fontFamily: string;
}

/**
 * Inter, the typeface the dashboard template sets. It is under the SIL Open
 * Font License 1.1 and ships with the application, so the interface renders
 * with no external network. AU Passata cannot ship in a public repository:
 * its licence covers AU staff and students, not redistribution.
 */
const fontStack =
  '"Inter", "Roboto", "Segoe UI", system-ui, -apple-system, Arial, sans-serif';

/**
 * Aarhus University colours, as the university publishes them.
 *
 * AU blue is Pantone 287, CMYK 100 80 0 15, RGB 0 61 115. The dark step is
 * that colour mixed with 75 percent black, which is the tint the design guide
 * allows, and the accent is the turquoise of the secondary palette.
 *
 * They replace the template's blue, `hsl(210, 98%, 48%)`, and that is the only
 * substitution: the greys, the type scale, the radii and the typeface stay as
 * the template has them.
 */
export const brand: Brand = {
  primary: '#003d73',
  primaryDark: '#002e56',
  primaryTint: '#eaf1fb',
  accent: '#00aba4',
  fontFamily: fontStack,
};

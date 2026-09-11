/**
 * Builds the MUI theme from the design tokens.
 *
 * This is the only place component defaults are set. A page never restyles a
 * button, a card or a table on its own, so the interface stays consistent and
 * a change of taste is a change of one file.
 *
 * Nothing here changes behaviour. Every override is presentation: colour,
 * spacing, radius, typography and focus.
 */

import { createTheme, Theme, alpha } from '@mui/material/styles';
import {
  brand,
  grey,
  minTouchTarget,
  overlayShadow,
  radius,
  spacingStep,
  status,
  white,
} from 'theme/tokens';

/**
 * The surfaces of the interface.
 *
 * A page sits on `canvas`, content sits on `surface`, and the two are
 * separated by `border`, not by a shadow.
 */
const surfaces = {
  canvas: grey[50],
  surface: white,
  surfaceMuted: grey[100],
  border: grey[200],
  textPrimary: grey[900],
  textSecondary: grey[600],
};

/**
 * The type scale, taken from the Material-UI dashboard template's
 * `themePrimitives.ts`.
 *
 * The template works in pixels; these are the same values in rem so that a
 * reader who raises the browser's font size gets larger text. `button` is not
 * in the template's list and keeps the sentence casing this design uses.
 */
const typography = {
  fontFamily: brand.fontFamily,
  h1: {
    fontSize: '3rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2.25rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  h3: { fontSize: '1.875rem', lineHeight: 1.2 },
  h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.5 },
  h5: { fontSize: '1.25rem', fontWeight: 600 },
  h6: { fontSize: '1.125rem', fontWeight: 600 },
  subtitle1: { fontSize: '1.125rem' },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
  body1: { fontSize: '0.875rem' },
  body2: { fontSize: '0.875rem', fontWeight: 400 },
  caption: { fontSize: '0.75rem', fontWeight: 400 },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none' as const,
  },
};

/** Build the theme. */
export default function createAppTheme(): Theme {
  return createTheme({
    spacing: spacingStep,
    shape: { borderRadius: radius },
    palette: {
      mode: 'light',
      primary: {
        main: brand.primary,
        dark: brand.primaryDark,
        light: brand.primaryTint,
        contrastText: white,
      },
      secondary: { main: brand.accent, contrastText: white },
      success: { main: status.success },
      warning: { main: status.warning },
      error: { main: status.error },
      info: { main: status.info },
      background: { default: surfaces.canvas, paper: surfaces.surface },
      text: {
        primary: surfaces.textPrimary,
        secondary: surfaces.textSecondary,
      },
      divider: surfaces.border,
      grey,
    },
    typography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: surfaces.canvas,
            color: surfaces.textPrimary,
            // Keeps long words and URLs from forcing a horizontal scrollbar
            // on a narrow screen.
            overflowWrap: 'break-word',
          },
          // One visible focus ring for the whole application. Without this the
          // interface is unusable with a keyboard once outlines are restyled.
          '*:focus-visible': {
            outline: `2px solid ${brand.primary}`,
            outlineOffset: 2,
          },
          // Respect the operating system setting. Anyone who asked for less
          // motion gets none.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },

      // Surfaces, from the template's customizations/surfaces.ts.
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: surfaces.border },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0, variant: 'outlined' },
        styleOverrides: {
          root: {
            padding: 16,
            gap: 16,
            borderRadius: radius,
            border: `1px solid ${surfaces.border}`,
            backgroundColor: surfaces.surface,
            boxShadow: 'none',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 0, '&:last-child': { paddingBottom: 0 } },
        },
      },

      // Inputs, from the template's customizations/inputs.tsx, with its
      // charcoal contained button replaced by the brand colour, flat.
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radius,
            height: '2.5rem',
            paddingInline: 16,
            boxShadow: 'none',
            '@media (pointer: coarse)': { minHeight: minTouchTarget },
          },
          sizeSmall: { height: '2rem', paddingInline: 12 },
          sizeLarge: { height: '2.75rem', paddingInline: 20 },
          outlined: {
            border: '1px solid',
            borderColor: surfaces.border,
            backgroundColor: alpha(grey[50], 0.3),
            color: surfaces.textPrimary,
          },
          text: { color: surfaces.textSecondary },
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              color: white,
              backgroundColor: brand.primary,
              backgroundImage: 'none',
              '&:hover': { backgroundColor: brand.primaryDark },
            },
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: {
          root: { boxShadow: 'none', borderRadius: radius },
          sizeMedium: {
            width: '2.5rem',
            height: '2.5rem',
            '@media (pointer: coarse)': {
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
            },
          },
        },
      },

      // Navigation, from the template's customizations/navigation.tsx.
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: {
            backgroundColor: surfaces.surface,
            color: surfaces.textPrimary,
            borderBottom: `1px solid ${surfaces.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surfaces.canvas,
            borderRight: `1px solid ${surfaces.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 4,
            borderRadius: radius,
            border: `1px solid ${surfaces.border}`,
            backgroundColor: surfaces.surface,
            boxShadow: overlayShadow,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { padding: '6px 8px', borderRadius: radius },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: radius,
            minHeight: minTouchTarget,
            '&.Mui-selected': {
              backgroundColor: brand.primaryTint,
              color: brand.primaryDark,
              '& .MuiListItemIcon-root': { color: brand.primary },
              '&:hover': { backgroundColor: brand.primaryTint },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: 40, color: surfaces.textSecondary },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: minTouchTarget,
            borderBottom: `1px solid ${surfaces.border}`,
          },
          indicator: { height: 2, borderRadius: 2 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: minTouchTarget,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: grey[800],
            fontSize: '0.75rem',
            borderRadius: radius,
            paddingBlock: 6,
            paddingInline: 10,
            // A tooltip carrying a URL must not stretch across the viewport.
            maxWidth: 320,
            wordBreak: 'break-all',
          },
          arrow: { color: grey[800] },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: surfaces.border } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: radius, backgroundColor: surfaces.surface },
          notchedOutline: { borderColor: surfaces.border },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: surfaces.border },
          head: {
            fontWeight: 600,
            color: surfaces.textSecondary,
            backgroundColor: surfaces.surfaceMuted,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: radius, boxShadow: overlayShadow },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(brand.primary, 0.12),
            color: brand.primaryDark,
            fontWeight: 700,
            fontSize: '0.875rem',
          },
        },
      },
    },
  });
}

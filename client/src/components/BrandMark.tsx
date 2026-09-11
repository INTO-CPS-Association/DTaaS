/**
 * The product mark: one figure, built on one side and drawn on the other.
 *
 * A twin is one thing in two states, so the mark is one body and not two. The
 * drawn half is a continuous outline and not a dashed one, because a dash
 * breaks into specks at the sixteen pixels a browser tab gives it.
 *
 * It is drawn inline so it costs no request and takes its colour from the
 * theme. `public/favicon.svg` carries the same geometry, in a concrete colour,
 * because a browser tab has no theme to inherit from. The existing
 * `docs/assets/dtaas-logo.svg` does not serve here: it is drawn on an A4
 * canvas and carries its wordmark as text instead of outlines, so it does not
 * survive being shrunk to a toolbar.
 */

import Box from '@mui/material/Box';

interface BrandMarkProps {
  /** Edge length in pixels. */
  size?: number;
}

function BrandMark({ size = 28 }: Readonly<BrandMarkProps>) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        color: 'primary.main',
        display: 'block',
      }}
    >
      <defs>
        <clipPath id="brand-mark-built">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
        <clipPath id="brand-mark-drawn">
          <rect x="12" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <g clipPath="url(#brand-mark-built)">
        <circle
          cx="12"
          cy="7.8"
          r="4.1"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.6 21.5 c0 -4.7 3.8 -7.4 8.4 -7.4 s8.4 2.7 8.4 7.4 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </g>
      <g clipPath="url(#brand-mark-drawn)">
        <circle
          cx="12"
          cy="7.8"
          r="4.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.6 21.5 c0 -4.7 3.8 -7.4 8.4 -7.4 s8.4 2.7 8.4 7.4 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </g>
    </Box>
  );
}

export default BrandMark;

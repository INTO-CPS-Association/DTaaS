/**
 * The product mark: one figure, built on one side and drawn on the other.
 *
 * A twin is one thing in two states, so the mark is one body and not two. The
 * drawn half is a continuous outline and not a dashed one, because a dash
 * breaks into specks at the sixteen pixels a browser tab gives it.
 *
 * It carries its own field, which is how Aarhus University uses colour: a solid
 * block with white content on it, and a secondary colour as an area and never
 * as a hairline on white. That is also what lets one drawing work on a light
 * page and a dark one, so the mark takes fixed colours instead of the theme's.
 *
 * It is drawn inline, so it costs no request. `public/favicon.svg` carries the
 * same geometry for the browser tab, and `docs/assets/brand/` carries it as
 * files for everything outside the application.
 */

import Box from '@mui/material/Box';
import { brand, white } from 'theme/tokens';

const SHOULDERS = 'M3.6 21.5 c0 -4.7 3.8 -7.4 8.4 -7.4 s8.4 2.7 8.4 7.4 Z';

interface BrandMarkProps {
  /** Edge length in pixels. */
  size?: number;
}

function BrandMark({ size = 28 }: Readonly<BrandMarkProps>) {
  const ground = brand.primaryDark;
  const built = white;
  const drawn = brand.markAccent;

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
      <rect width="24" height="24" rx="5.28" fill={ground} />
      <g transform="translate(4.08,4.08) scale(0.66)">
        <g clipPath="url(#brand-mark-built)">
          <circle
            cx="12"
            cy="7.8"
            r="4.1"
            fill={built}
            stroke={built}
            strokeWidth="1.7"
          />
          <path
            d={SHOULDERS}
            fill={built}
            stroke={built}
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
            stroke={drawn}
            strokeWidth="1.7"
          />
          <path
            d={SHOULDERS}
            fill="none"
            stroke={drawn}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </Box>
  );
}

export default BrandMark;

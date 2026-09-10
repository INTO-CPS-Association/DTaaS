import Link from '@mui/material/Link';

/**
 * The first thing a keyboard reaches on any page. It is off screen until it
 * takes focus, and it saves a keyboard user from tabbing through the whole
 * navigation on every page.
 *
 * It lives here instead of inside one layout because the pages reached without
 * signing in need it as much as the rest, and they use a different layout.
 */
function SkipToContent() {
  return (
    <Link
      href="#main-content"
      sx={{
        position: 'absolute',
        left: -9999,
        top: 0,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        '&:focus': { left: 8, top: 8 },
      }}
    >
      Skip to content
    </Link>
  );
}

export default SkipToContent;

/**
 * The mark and the product name, centred in the bar.
 *
 * It is the middle cell of the toolbar's three column grid, whose outer
 * columns are equal, so the title is centred on the bar and not on whatever
 * space the controls leave. Nothing here measures those controls.
 *
 * Shared by the signed in toolbar and the public one, so the header does not
 * change shape at sign in.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import BrandMark from 'components/BrandMark';

function AppTitle() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.25,
        minWidth: 0,
      }}
    >
      <BrandMark size={26} />
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{ fontWeight: 700, letterSpacing: '-0.01em', minWidth: 0 }}
      >
        DTaaS - Digital Twin as a Service
      </Typography>
    </Box>
  );
}

export default AppTitle;

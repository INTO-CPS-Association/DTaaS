/**
 * The page shown for an address the application does not have.
 *
 * Before this, an unknown path fell through to the router's own error screen,
 * which prints "Unexpected Application Error!", a 404, and a paragraph
 * addressed to the developer telling them to supply a better one. That is a
 * message for whoever wrote the application, shown to whoever is using it.
 *
 * It appears more often than a typed address would suggest: every embedded
 * workspace page is an address, so a gateway that routes one of them to the
 * client instead of the workspace lands here, inside the frame. Saying which
 * address failed is what makes that diagnosable.
 */

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import ReportGmailerrorredRoundedIcon from '@mui/icons-material/ReportGmailerrorredRounded';
import { Link, useLocation } from 'react-router-dom';
import LayoutPublic from 'page/LayoutPublic';

function NotFoundContent() {
  const { pathname } = useLocation();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        p: { xs: 2, md: 4 },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: 'primary.light',
            color: 'primary.dark',
            mb: 1,
          }}
        >
          <ReportGmailerrorredRoundedIcon />
        </Box>

        <Typography variant="h4" component="h1">
          This Page Does Not Exist
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Nothing is served at the address below. If it is a workspace page, the
          gateway is routing it to the application instead of to the workspace.
        </Typography>

        {/* The address is what makes this diagnosable, and it comes from the
            router, not from anything a page supplied. */}
        <Typography
          variant="body2"
          component="code"
          sx={{
            mt: 1,
            px: 1.5,
            py: 1,
            width: '100%',
            borderRadius: 1,
            backgroundColor: 'grey.100',
            color: 'text.primary',
            wordBreak: 'break-all',
          }}
        >
          {pathname}
        </Typography>

        <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>
          Back to the Start
        </Button>
      </Card>
    </Box>
  );
}

function NotFound() {
  const content = <NotFoundContent />;

  // Embedded errors already sit inside the parent application's layout.
  if (typeof window !== 'undefined' && window.self !== window.top) {
    return content;
  }

  return <LayoutPublic containerMaxWidth="md">{content}</LayoutPublic>;
}

export default NotFound;

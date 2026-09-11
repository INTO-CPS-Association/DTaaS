/**
 * The frame every page sits in: one surface, a title, and a line saying what
 * the page is for.
 *
 * It exists so the three pages do not each invent their own heading. The
 * workbench had one and the library and digital twin pages started straight
 * at their tabs, which left two of the three with no answer to "what is this".
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface PageShellProps {
  /** The page name. Rendered as the document's only h1. */
  title: string;
  /** One line saying what the page is for. */
  description?: string;
  children: React.ReactNode;
}

function PageShell({ title, description, children }: Readonly<PageShellProps>) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

export default PageShell;

/**
 * The application footer.
 *
 * Acknowledgement, kept here instead of on the page: the layout of this
 * application began from the Material-UI Dashboard template, MIT licensed,
 * at
 * https://github.com/mui/material-ui/tree/v5.11.9/docs/data/material/getting-started/templates/dashboard
 * The MIT license is satisfied by the license text shipping with the
 * dependency, so no visible credit is required, and this note keeps the
 * origin recorded where a developer will find it.
 *
 * Three columns of links above a bottom bar carrying the copyright. On a
 * narrow screen the columns stack, which is why the links are grouped instead
 * of laid out as one long row.
 *
 * Every link here already existed in the application. Nothing new is reachable
 * from the footer.
 */

import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { SxProps, Theme } from '@mui/material/styles';
import { ASSOCIATION_URL, DOCS_URL, REPOSITORY_URL } from 'util/toolbarUtil';

interface OwnProps {
  sx?: SxProps<Theme>;
}

// `HEAD` and not a branch name: GitHub resolves it to whatever the default
// branch is, so a user facing link does not break when a branch is renamed
// or merged away.
const LICENSE_URL = `${REPOSITORY_URL}/blob/HEAD/LICENSE.md`;

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

const platformLinks: readonly FooterLink[] = [
  { label: 'Documentation', href: DOCS_URL },
  { label: 'Source Code', href: REPOSITORY_URL },
  { label: 'Issues', href: `${REPOSITORY_URL}/issues` },
];

const projectLinks: readonly FooterLink[] = [
  { label: 'INTO-CPS Association', href: ASSOCIATION_URL },
  { label: 'License', href: LICENSE_URL },
];

/**
 * External links open in a new tab. `rel="noreferrer"` is required with
 * `target="_blank"`: without it the opened page can reach back through
 * `window.opener` and navigate this one.
 */
function ExternalLink({ label, href }: FooterLink) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      variant="body2"
      sx={{ display: 'inline-block', py: 0.25 }}
    >
      {label}
    </Link>
  );
}

function LinkColumn({
  heading,
  links,
}: Readonly<{
  heading: string;
  links: readonly FooterLink[];
}>) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Typography
        variant="subtitle2"
        color="text.primary"
        component="h2"
        sx={{ mb: 0.5 }}
      >
        {heading}
      </Typography>
      {links.map((link) => (
        <ExternalLink key={link.href} {...link} />
      ))}
    </Stack>
  );
}

function Copyright(props: OwnProps) {
  return (
    <Typography variant="body2" color="text.secondary" {...props}>
      {'Copyright © '}
      <Link href={ASSOCIATION_URL} target="_blank" rel="noreferrer">
        The INTO-CPS Association
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

function RenderFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" component="h2" sx={{ mb: 0.5 }}>
              DTaaS
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 420 }}
            >
              An open platform for creating, running and sharing digital twins.
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <LinkColumn heading="Platform" links={platformLinks} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <LinkColumn heading="Project" links={projectLinks} />
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 2, md: 3 } }} />

        <Copyright />
      </Container>
    </Box>
  );
}

function Footer() {
  return <RenderFooter />;
}

export default Footer;

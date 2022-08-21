import * as React from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';

function Copyright(props) {
  return (
    /* jshint ignore:start */
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://into-cps.org/" target="_blank" rel="noreferrer">
        The INTO-CPS Association
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
    /* jshint ignore:end */
  );
}

function RenderFooter() {
  return (
    /* jshint ignore:start */
    <React.Fragment>
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Copyright sx={{ pt: 4 }} />
          </Container>
    </React.Fragment>
    /* jshint ignore:end */
  );
}

export default function Footer() {
  return <RenderFooter />; /* jshint ignore:line */
}

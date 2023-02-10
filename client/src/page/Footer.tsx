import * as React from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import { SxProps, Theme } from '@mui/material/styles';

interface Props {
  sx: SxProps<Theme>;
}

const Copyright = (props: Props) => {
  return (
    /* jshint ignore:start */
    <Typography
      variant='body2'
      color='text.secondary'
      align='center'
      {...props}
    >
      {'Copyright © '}
      <Link
        color='inherit'
        href='https://into-cps.org/'
        target='_blank'
        rel='noreferrer'
      >
        The INTO-CPS Association
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
    /* jshint ignore:end */
  );
};

const RenderFooter = () => {
  return (
    /* jshint ignore:start */
    <React.Fragment>
      <Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
        <Copyright sx={{ pt: 4 }} />
      </Container>
    </React.Fragment>
    /* jshint ignore:end */
  );
};

const Footer = () => {
  return <RenderFooter />; /* jshint ignore:line */
};

export default Footer;

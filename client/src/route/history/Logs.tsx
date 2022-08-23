import * as React from 'react';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Title from '../../page/Title';

function preventDefault(event) {
  event.preventDefault();
}

function LogContents() {
  return (
    /* jshint ignore:start */
    <React.Fragment>
    <Title>Logs</Title>
    <Typography variant="body1" gutterBottom>
    body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
    blanditiis tenetur unde suscipit, quam beatae rerum inventore consectetur,
    neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum
    quasi quidem quibusdam.
  </Typography>
  <Link color="primary" href="#" onClick={preventDefault} sx={{ mt: 3 }}>
        See more
  </Link>
  </React.Fragment>
  /* jshint ignore:end */
  );
}

export default function Logs() {
  return <LogContents />; /* jshint ignore:line */
}

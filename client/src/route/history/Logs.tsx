import * as React from 'react';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Title from '../../page/Title';

function preventDefault(
  event:React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLSpanElement>,
) {
  event.preventDefault();
}

function LogContents() {
  return (
    <>
      <Title>Logs</Title>
      <Typography variant='body1' gutterBottom>
        body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
        blanditiis tenetur unde suscipit, quam beatae rerum inventore
        consectetur, neque doloribus, cupiditate numquam dignissimos laborum
        fugiat deleniti? Eum quasi quidem quibusdam.
      </Typography>
      <Link color='primary' href='#' onClick={preventDefault} sx={{ mt: 3 }}>
        See more
      </Link>
    </>
  );
}

export default function Logs() {
  return <LogContents />;
}

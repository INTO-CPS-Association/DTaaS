import * as React from 'react';
import Typography from '@mui/material/Typography';

interface TitleProps {
  children: React.ReactNode;
}

const Title = (props: TitleProps) => {
  return (
    /* jshint ignore:start */
    <Typography component='h2' variant='h6' color='primary' gutterBottom>
      {props.children}
    </Typography>
    /* jshint ignore:end */
  );
};

export default Title;

import * as React from 'react';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';

function Title(props) {
  return (
    /* jshint ignore:start */
    <Typography component="h2" variant="h6" color="primary" gutterBottom>
      {props.children}
    </Typography>
  /* jshint ignore:end */
  );
}

Title.propTypes = {
  children: PropTypes.node,
};

export default Title;

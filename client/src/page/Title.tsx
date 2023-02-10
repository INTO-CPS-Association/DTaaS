import * as React from "react";
import Typography from "@mui/material/Typography";

interface OwnProps {
  children: React.ReactNode;
}

function Title(props: OwnProps) {
  return (
    <Typography component='h2' variant='h6' color='primary' gutterBottom>
      {props.children}
    </Typography>
  );
}

export default Title;

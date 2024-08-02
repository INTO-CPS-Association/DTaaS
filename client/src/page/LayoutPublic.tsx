import * as React from 'react';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Footer from 'page/Footer';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Container } from '@mui/material';
import LinkButtons from 'components/LinkButtons';
import toolbarLinkValues from 'util/toolbarUtils';

const DTappBar = () => (
  <AppBar position="absolute">
    <Toolbar>
      <Typography
        component="h1"
        variant="h6"
        color="inherit"
        noWrap
        textAlign="center"
        sx={{ flexGrow: 1 }}
      >
        The Digital Twin as a Service
      </Typography>
      <LinkButtons buttons={toolbarLinkValues} size={2.5} />
    </Toolbar>
  </AppBar>
);

function LayoutPublic(props: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <DTappBar />
      <Toolbar />
      <Container component="main" maxWidth="xs">
        {props.children}
      </Container>

      <Box />
      <Footer />
    </Box>
  );
}

export default LayoutPublic;

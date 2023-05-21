import * as React from 'react';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Footer from 'page/Footer';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Container } from '@mui/material';

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

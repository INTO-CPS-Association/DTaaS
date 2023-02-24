import * as React from 'react';
import { createTheme, Theme, ThemeProvider } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import DTaaSMenu from './Menu';
import Footer from './Footer';

const mdTheme: Theme = createTheme();

function Layout(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={mdTheme}>
      <Box sx={{ display: 'flex' }}>
        <DTaaSMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {props.children}
          </Container>
          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Layout;
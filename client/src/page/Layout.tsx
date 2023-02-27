import * as React from 'react';
import { createTheme, Theme, ThemeProvider } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import DTaaSMenu from './Menu';
import Footer from './Footer';

const mdTheme: Theme = createTheme();

function Layout(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={mdTheme}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <DTaaSMenu />
        <Box
          component="main"
          sx={{
            minHeight: '100vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            // gridTemplateRows: 'auto 1fr auto',
          }}
        >
          {/* Toolbar is the space between the menu and the content */}
          <Toolbar />{' '}
          <Container
            maxWidth="lg"
            sx={{ mt: 4, mb: 2, flexGrow: 1 }}
            className="content"
          >
            <Grid container spacing={3} sx={{ minHeight: '100%' }}>
              {props.children}
            </Grid>
          </Container>
          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Layout;

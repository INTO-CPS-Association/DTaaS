import * as React from 'react';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import DTaaSMenu from './Menu';
import Footer from './Footer';

function MenuLayout(props: { children: React.ReactNode }) {
  return (
    <>
      <DTaaSMenu />
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <Toolbar />
        {props.children}
      </Box>
    </>
  );
}

function Layout(props: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <MenuLayout>
        <Container
          maxWidth="lg"
          sx={{ mt: 4, mb: 2, flexGrow: 1, display: 'flex' }}
          className="content"
        >
          <Grid container spacing={3} sx={{ minHeight: '100%' }}>
            {React.Children.map(props.children, (child) => (
              <Grid item xs={12} md={12} lg={12}>
                {child}
              </Grid>
            ))}
          </Grid>
        </Container>
        <Footer />
      </MenuLayout>
    </Box>
  );
}

export default Layout;

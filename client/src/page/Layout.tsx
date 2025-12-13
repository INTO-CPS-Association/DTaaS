import React, { Children } from 'react';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import DTaaSMenu from 'page/Menu';
import Footer from 'page/Footer';

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

function Layout(props: {
  children: React.ReactNode;
  sx?: React.CSSProperties;
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <MenuLayout>
        <Container
          maxWidth="lg"
          sx={{ mt: 1, mb: 1, flexGrow: 1, ...props.sx }}
          className="content"
        >
          <Grid container spacing={3} sx={{ minHeight: '100%' }}>
            {Children.map(props.children, (child) => (
              <Grid size={{ xs: 12, md: 12, lg: 12 }}>{child}</Grid>
            ))}
          </Grid>
        </Container>
        <Footer />
      </MenuLayout>
    </Box>
  );
}

export default Layout;

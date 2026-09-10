import React, { Children, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import SkipToContent from 'components/SkipToContent';
import DTaaSMenu from 'page/Menu';
import Footer from 'page/Footer';

function MenuLayout(props: { children: React.ReactNode }) {
  const main = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // The content column scrolls, not the document, so the browser does not
  // reset it between routes. Without this a page opens wherever the previous
  // one was left, which reads as content already tucked under the toolbar.
  useEffect(() => {
    if (main.current) {
      main.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <>
      <DTaaSMenu />
      <Box
        component="main"
        id="main-content"
        ref={main}
        tabIndex={-1}
        sx={{
          // The content column is its own scrolling region, so the toolbar and
          // the drawer stay put and only this moves. Without it the whole
          // document scrolls and the navigation travels with the page.
          height: '100dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          // The drawer rail is 56px wide and the content must not sit under it.
          minWidth: 0,
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
  maxWidth?: React.ComponentProps<typeof Container>['maxWidth'];
}) {
  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <SkipToContent />
      <MenuLayout>
        <Container
          // `xl` and not `lg`: the pages that matter here embed a file
          // browser and a table, and 1200px wasted a third of a wide screen.
          maxWidth={props.maxWidth ?? 'xl'}
          sx={{
            display: 'flex',
            mt: { xs: 2, md: 3 },
            mb: { xs: 2, md: 3 },
            flexGrow: 1,
            ...props.sx,
          }}
          className="content"
        >
          <Grid
            container
            spacing={3}
            sx={{ minHeight: '100%', flexGrow: 1, width: '100%' }}
          >
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

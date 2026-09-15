import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Footer from 'page/Footer';
import Box from '@mui/material/Box';
import { Breakpoint, Container } from '@mui/material';
import LinkButtons from 'components/LinkButtons';
import AppTitle from 'components/AppTitle';
import toolbarLinkValues from 'util/toolbarUtil';
import SkipToContent from 'components/SkipToContent';

/**
 * The header of the pages reached without signing in.
 *
 * It renders the same title unit and the same icon size as the signed in
 * toolbar, so the header does not change shape the moment someone signs in.
 */
const DTappBar = () => (
  <AppBar position="absolute">
    {/* The same three columns as the signed in bar, so the header does not
        change shape at sign in. The first cell is empty here and still holds
        its share, which is what centres the title. */}
    <Toolbar
      sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 1 }}
    >
      <Box />
      <AppTitle />
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          flexShrink: 0,
          justifySelf: 'end',
          // The same colour the drawer gives its icons: these fill the same
          // role and sat brighter only because the app bar sets text.primary.
          color: 'text.secondary',
        }}
      >
        <LinkButtons buttons={toolbarLinkValues} size={1.5} />
      </Box>
    </Toolbar>
  </AppBar>
);

function LayoutPublic(props: {
  children: React.ReactNode;
  containerMaxWidth?: Breakpoint;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
      }}
    >
      <SkipToContent />
      <DTappBar />
      <Toolbar />
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth={props.containerMaxWidth ? props.containerMaxWidth : 'xs'}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        {props.children}
      </Container>
      <Footer />
    </Box>
  );
}

export default LayoutPublic;

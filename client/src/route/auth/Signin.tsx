/* eslint-disable no-console */
/*
src: https://github.com/mui/material-ui/blob/v5.10.0/docs/data/material/getting-started/templates/sign-in/SignIn.js
*/

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
// import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
// import TextField from '@mui/material/TextField';
// import FormControlLabel from '@mui/material/FormControlLabel';
// import Checkbox from '@mui/material/Checkbox';
import Toolbar from '@mui/material/Toolbar';
// import Link from '@mui/material/Link';
// import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, Theme, ThemeProvider } from '@mui/material/styles';

import { getGitLabAccessCode } from '../../util/authentication';

import Footer from '../../page/Footer';

import '../../css/style.css';

// const drawerWidth = 240;

// TODO: The following style should be moved
// TODO: Transform to ts?

// const AppBar = styled(MuiAppBar, {
//   shouldForwardProp: (prop) => prop !== 'open',
// })(({ theme, open }) => ({
//   zIndex: theme.zIndex.drawer + 1,
//   transition: theme.transitions.create(['width', 'margin'], {
//     easing: theme.transitions.easing.sharp,
//     duration: theme.transitions.duration.leavingScreen,
//   }),
//   ...(open && {
//     marginLeft: drawerWidth,
//     width: `calc(100% - ${drawerWidth}px)`,
//     transition: theme.transitions.create(['width', 'margin'], {
//       easing: theme.transitions.easing.sharp,
//       duration: theme.transitions.duration.enteringScreen,
//     }),
//   }),
// }));

const CLIENT_ID = window.env.REACT_APP_CLIENT_ID;
const REDIRECT_URL = window.env.REACT_APP_REDIRECT_URL;
const REQUESTED_SCOPES = window.env.REACT_APP_REQUESTED_SCOPES;

const theme: Theme = createTheme();

function SignIn() {
  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <AppBar position="absolute">
            <Toolbar
              sx={{
                pr: '24px', // keep right padding when drawer closed
              }}
            >
              <Typography
                component="h1"
                variant="h6"
                color="inherit"
                noWrap
                sx={{ flexGrow: 1 }}
              >
                The Digital Twin as a Service
              </Typography>
            </Toolbar>
          </AppBar>
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <button
            onClick={() =>
              getGitLabAccessCode(CLIENT_ID, REQUESTED_SCOPES, REDIRECT_URL)
            }
          >
            <a href="#" className="gitlabButton">
              <img
                src="https://gitlab.com/gitlab-com/gitlab-artwork/-/raw/master/logo/logo-square.png"
                alt="GitLab logo"
                className="gitlabLogo"
              ></img>
              <span>Sign in with GitLab</span>
            </a>
          </button>
        </Box>
        <Footer data-testid="footer" />
      </Container>
    </ThemeProvider>
  );
}

export default SignIn;
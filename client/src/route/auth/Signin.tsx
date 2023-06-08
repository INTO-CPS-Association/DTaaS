import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from 'react-oidc-context';
import Button from '@mui/material/Button';

function SignIn() {
  const auth = useAuth();

  const startAuthProcess = () => {
    auth.signinRedirect();
  };

  return (
    <Box
      sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Button
        onClick={startAuthProcess}
        variant="contained"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#fc6d27',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          fontWeight: 'bold',
          textDecoration: 'none',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: '#fc6d27',
            textDecoration: 'none',
          },
        }}
        startIcon={
          <img
            src={
              'https://gitlab.com/gitlab-com/gitlab-artwork/-/raw/master/logo/logo-square.png'
            }
            alt="GitLab logo"
            style={{
              height: '20px',
              marginRight: '10px',
            }}
          />
        }
      >
        Sign In with GitLab
      </Button>
    </Box>
  );
}

export default SignIn;

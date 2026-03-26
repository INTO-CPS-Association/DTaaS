import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from 'react-oidc-context';
import Button from '@mui/material/Button';

function SignIn() {
  const auth = useAuth();

  const startAuthProcess = () => {
    auth.signinRedirect();
  };

  return <BoxForSignIn>{signInButton(startAuthProcess)}</BoxForSignIn>;
}

function BoxForSignIn(props: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {props.children}
    </Box>
  );
}

const signInButton = (startAuthProcess: () => void) => (
  <Button
    onClick={startAuthProcess}
    variant="contained"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      fontWeight: 'bold',
      textDecoration: 'none',
      textTransform: 'none',
      '&:hover': {
        textDecoration: 'none',
      },
    }}
    startIcon={<LockOutlinedIcon />}
  >
    SignIn
  </Button>
);

export default SignIn;

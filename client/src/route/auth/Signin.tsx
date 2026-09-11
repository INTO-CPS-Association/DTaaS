import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from 'react-oidc-context';
import Button from '@mui/material/Button';
import BrandMark from 'components/BrandMark';

/**
 * The sign in page.
 *
 * It is the first screen anyone sees, and it used to be a single button
 * floating below the toolbar with nothing around it. The button, its label and
 * what it does are unchanged: this gives it a card, says which platform is
 * being signed into, and says where the sign in goes, because a redirect to a
 * GitLab the person did not expect is the most common way this step confuses
 * someone.
 */
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
        mt: { xs: 6, md: 10 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1,
        }}
      >
        <BrandMark size={40} />
        <Typography variant="h2" component="h1" sx={{ mt: 1 }}>
          Sign In
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in with your GitLab account. You will be taken there to
          authorise, and brought back afterwards.
        </Typography>
        {props.children}
      </Card>
    </Box>
  );
}

const signInButton = (startAuthProcess: () => void) => (
  <Button
    onClick={startAuthProcess}
    variant="contained"
    size="large"
    fullWidth
    startIcon={<LockOutlinedIcon />}
    data-logger-element="button"
    data-logger-label="SignIn"
  >
    Sign In
  </Button>
);

export default SignIn;

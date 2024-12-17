import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from 'react-oidc-context';
import Button from '@mui/material/Button';
import { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import VerifyConfig, {
  getValidationResults,
  validationType,
} from './VerifyConfig';

function SignIn() {
  const auth = useAuth();
  const [validationResults, setValidationResults] = useState<{
    [key: string]: validationType;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  const configsToVerify = [
    'url',
    'auth_authority',
    'redirect_uri',
    'logout_redirect_uri',
  ];

  useEffect(() => {
    const fetchValidationResults = async () => {
      const results = await getValidationResults(configsToVerify);
      setValidationResults(results);
      setIsLoading(false);
    };
    fetchValidationResults();
  });

    const startAuthProcess = () => {
        auth.signinRedirect();
    };

  const loading = loadingComponent();
  const signin = signInComponent(startAuthProcess);
  const verifyConfig = verifyConfigComponent(configsToVerify);

  let displayedComponent = loading;
  const hasConfigErrors = configsToVerify.some(
    (key) => validationResults[key]?.error !== undefined,
  );

  if (!isLoading) {
    // Show signin if config is ready and good, otherwise show problems
    displayedComponent = signin;
    if (hasConfigErrors) {
      displayedComponent = verifyConfig;
    }
  }

  return displayedComponent;
}

const verifyConfigComponent = (configsToVerify: string[]): React.ReactNode =>
  VerifyConfig({
    keys: configsToVerify,
    title: 'Config validation failed',
  });

const loadingComponent = (): React.ReactNode => (
  <Box
    sx={{
      marginTop: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    Verifying configuration
    <CircularProgress />
  </Box>
);

const signInComponent = (startAuthProcess: () => void): React.ReactNode => (
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

export default SignIn;

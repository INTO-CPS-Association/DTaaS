import * as React from 'react';
import { useEffect, useState } from 'react';
import { getValidationResults, ValidationType } from 'util/configUtil';
import { Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ConfigItem, loadingComponent } from './ConfigItems';

const paperStyle = {
  p: 2,
  marginTop: '2%',
  position: 'relative',
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const typographyStyle = {
  fontSize: 'clamp(0.2rem, 4vw, 1.6rem)',
  padding: 'clamp(0, 4vw, 5%)',
};

const DeveloperConfig = (validationResults: {
  [key: string]: ValidationType;
}): JSX.Element => (
  <Paper
    sx={{
      ...paperStyle,
      width: 'min(60vw, 100%)',
      height: 'auto',
      maxHeight: '75vh',
      minWidth: '360px',
      overflow: 'auto',
    }}
  >
    <Typography variant="h4" sx={typographyStyle}>
      {'Config verification'}
    </Typography>
    <div id="config-items">
      {Object.entries(window.env).map(([key, value]) => (
        <ConfigItem
          key={key}
          label={key}
          value={value!}
          validation={validationResults[key]}
        />
      ))}
    </div>
  </Paper>
);

const userConfigTitle: JSX.Element = (
  <>
    Invalid Application Configuration. Please contact the administrator of your
    DTaaS installation.
    <br />
    <a href="./developer" style={{ fontSize: '0.7em' }}>
      Inspect configuration
    </a>
  </>
);

const UserConfig = (): JSX.Element => (
  <Paper
    sx={{
      ...paperStyle,
      width: 'min(60vw, 390px)',
      aspectRatio: '2 / 1',
      overflow: 'hidden',
    }}
  >
    <Typography variant="h4" sx={typographyStyle}>
      {userConfigTitle}
    </Typography>
  </Paper>
);

const useValidationResults = () => {
  const [validationResults, setValidationResults] = useState<{
    [key: string]: ValidationType;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchValidationResults = async () => {
      try {
        const results = await getValidationResults();
        setValidationResults(results);
      } finally {
        setIsLoading(false);
      }
    };

    fetchValidationResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.env]);

  return { validationResults, isLoading };
};

const useConfigErrors = (validationResults: {
  [key: string]: ValidationType;
}) =>
  Object.keys(window.env).some(
    (key) => key !== undefined && validationResults[key]?.error !== undefined,
  );

const Config = (props: { role: string }) => {
  const navigate = useNavigate();
  const { validationResults, isLoading } = useValidationResults();
  const hasConfigErrors = useConfigErrors(validationResults);

  const configVerification =
    props.role === 'user' ? UserConfig() : DeveloperConfig(validationResults);

  const shouldRedirect =
    !isLoading && props.role === 'user' && !hasConfigErrors;
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/');
    }
  }, [shouldRedirect, navigate]);

  if (isLoading) {
    return loadingComponent();
  }

  if (shouldRedirect) {
    return null;
  }

  return configVerification;
};

export default Config;

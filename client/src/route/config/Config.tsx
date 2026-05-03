import React, { useEffect, useState, useMemo } from 'react';
import { getValidationResults, ValidationType } from 'util/configUtil';
import { Paper, Typography } from '@mui/material';
import { ConfigItem, loadingComponent } from 'route/config/ConfigItems';

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

const DeveloperConfig = (
  validationResults: Record<string, ValidationType>,
): React.ReactElement => (
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

const userConfigInvalidText: React.ReactElement = (
  <>
    Invalid Application Configuration. Please contact the administrator of your
    DTaaS installation.
    <br />
    <a href="./developer" style={{ fontSize: '0.7em' }}>
      Inspect configuration
    </a>
  </>
);

const userConfigValidText: React.ReactElement = (
  <>
    <p>Configuration appears to be valid.</p>
    <a href="/">Return to login</a>
  </>
);

const UserConfig = (
  validationResults: Record<string, ValidationType>,
): React.ReactElement => {
  const hasConfigErrors = useConfigErrors(validationResults);
  return (
    <Paper
      sx={{
        ...paperStyle,
        width: 'min(60vw, 390px)',
        aspectRatio: '2 / 1',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h4" sx={typographyStyle}>
        {hasConfigErrors ? userConfigInvalidText : userConfigValidText}
      </Typography>
    </Paper>
  );
};

const useValidationResults = () => {
  const [validationResults, setValidationResults] = useState<
    Record<string, ValidationType>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchValidationResults = async () => {
      try {
        const results = await getValidationResults();
        setValidationResults(results);
      } catch (_error) {
        throw new Error('Failed to fetch validation results');
      } finally {
        setIsLoading(false);
      }
    };

    fetchValidationResults().catch((error: unknown) => {
      throw new Error(`Failed to fetch validation results: ${error}`);
    });
  }, []);

  return { validationResults, isLoading };
};

const useConfigErrors = (validationResults: Record<string, ValidationType>) =>
  Object.keys(window.env).some((key) => {
    const result = validationResults[key];
    return result && 'error' in result && result.error !== undefined;
  });

const Config = (props: { role: string }) => {
  const { validationResults, isLoading } = useValidationResults();

  const configVerification = useMemo(
    () =>
      props.role === 'user'
        ? UserConfig(validationResults)
        : DeveloperConfig(validationResults),
    [validationResults, props.role],
  );

  if (isLoading) {
    return loadingComponent();
  }

  return configVerification;
};

export default Config;

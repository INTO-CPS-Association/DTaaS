import { useEffect, useState } from 'react';
import { getValidationResults, ValidationType } from 'util/configUtil';
import { Paper, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ConfigItem, loadingComponent } from 'route/config/ConfigItems';

/**
 * Where the check is shown.
 *
 * `page` is the public `config/user` and `config/developer` pages, a card
 * centred on an empty background, reachable before sign-in. `embedded` is the
 * same check inside the application, where the person is signed in: the card
 * takes the width it is given, and its links go through the router.
 */
type ConfigVariant = 'page' | 'embedded';

type ValidationResults = Record<string, ValidationType>;

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

function DeveloperConfig({
  validationResults,
  variant,
}: Readonly<{ validationResults: ValidationResults; variant: ConfigVariant }>) {
  // On the public page the list scrolls inside its own card. Embedded, the
  // application page scrolls, as it does for every other page.
  return (
    <Paper
      sx={
        variant === 'page'
          ? {
              ...paperStyle,
              width: 'min(60vw, 100%)',
              height: 'auto',
              maxHeight: '75vh',
              minWidth: '360px',
              overflow: 'auto',
            }
          : { ...paperStyle, width: '100%', marginTop: 0 }
      }
    >
      <Typography variant="h4" sx={typographyStyle}>
        {'Config verification'}
      </Typography>
      <div id="config-items">
        {Object.entries(validationResults).map(([key, validation]) => (
          <ConfigItem
            key={key}
            label={key}
            value={globalThis.env[key] ?? ''}
            validation={validation}
          />
        ))}
      </div>
    </Paper>
  );
}

// The public page links relative to itself, `./developer`. Inside the
// application the link goes to the developer view of Insights, which keeps the
// menu, and the router adds the base path.
function InspectLink({ variant }: Readonly<{ variant: ConfigVariant }>) {
  const common = {
    style: { fontSize: '0.7em' },
    'data-logger-element': 'link',
    'data-logger-label': 'Inspect Configuration',
  };
  if (variant === 'embedded') {
    return (
      <Link component={RouterLink} to="/insights/developer" {...common}>
        Inspect configuration
      </Link>
    );
  }
  return (
    <a href="./developer" {...common}>
      Inspect configuration
    </a>
  );
}

function InvalidText({ variant }: Readonly<{ variant: ConfigVariant }>) {
  return (
    <>
      Invalid Application Configuration. Please contact the administrator of
      your DTaaS installation.
      <br />
      <InspectLink variant={variant} />
    </>
  );
}

// A signed-in person has no login to return to, so the embedded view states
// the result and offers no link.
function ValidText({ variant }: Readonly<{ variant: ConfigVariant }>) {
  return (
    <>
      <p>Configuration appears to be valid.</p>
      {variant === 'page' && (
        <a
          href="/"
          data-logger-element="link"
          data-logger-label="Return to Login"
        >
          Return to login
        </a>
      )}
    </>
  );
}

const hasConfigErrors = (validationResults: ValidationResults) =>
  Object.values(validationResults).some(
    (result) => result && 'error' in result && result.error !== undefined,
  );

// The public page is a small card with a fixed width. Embedded, the card sits
// in a page that already has its own width and margins.
const cardStyle = (variant: ConfigVariant) =>
  variant === 'page'
    ? { ...paperStyle, width: 'min(60vw, 390px)' }
    : { ...paperStyle, width: '100%', marginTop: 0 };

function UserConfig({
  validationResults,
  variant,
}: Readonly<{ validationResults: ValidationResults; variant: ConfigVariant }>) {
  // On the public page the card also keeps a fixed shape.
  return (
    <Paper
      sx={
        variant === 'page'
          ? { ...cardStyle(variant), aspectRatio: '2 / 1', overflow: 'hidden' }
          : { ...cardStyle(variant), overflow: 'hidden' }
      }
    >
      <Typography variant="h4" sx={typographyStyle}>
        {hasConfigErrors(validationResults) ? (
          <InvalidText variant={variant} />
        ) : (
          <ValidText variant={variant} />
        )}
      </Typography>
    </Paper>
  );
}

const useValidationResults = () => {
  const [validationResults, setValidationResults] = useState<ValidationResults>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  // A failed check is kept as state so the page can say it could not check,
  // instead of reading an empty result as a valid configuration.
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    getValidationResults()
      .then(setValidationResults)
      .catch((error: unknown) => {
        // The page shows a generic message, so the cause goes to the console.
        // eslint-disable-next-line no-console
        console.error('The configuration check failed.', error);
        setCheckFailed(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { validationResults, isLoading, checkFailed };
};

function CheckFailed({ variant }: Readonly<{ variant: ConfigVariant }>) {
  return (
    <Paper sx={cardStyle(variant)}>
      <Typography variant="h4" sx={typographyStyle}>
        The configuration could not be checked. Please try again later, or
        contact the administrator of your DTaaS installation.
      </Typography>
    </Paper>
  );
}

const Config = (props: { role: string; variant?: ConfigVariant }) => {
  const { validationResults, isLoading, checkFailed } = useValidationResults();
  const variant = props.variant ?? 'page';

  if (isLoading) {
    return loadingComponent();
  }

  if (checkFailed) {
    return <CheckFailed variant={variant} />;
  }

  return props.role === 'user' ? (
    <UserConfig validationResults={validationResults} variant={variant} />
  ) : (
    <DeveloperConfig validationResults={validationResults} variant={variant} />
  );
};

export default Config;

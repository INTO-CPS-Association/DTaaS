import { Paper, Tooltip, Typography } from '@mui/material';
import * as React from 'react';
import { z } from 'zod';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString = z.string();
const ScopesString = z.literal('openid profile read_user read_repository api');

type validationType = {
    value?: string;
    status?: number;
    error?: string;
};

async function urlIsReachable(url: string): Promise<validationType> {
    try {
        const response = await fetch(url, { method: 'HEAD' });

        if (response.ok || response.status === 302) {
            return { value: url, status: response.status, error: undefined };
        }
        return {
            value: url,
            status: response.status,
            error: `Unexpected response code ${response.status} from ${url}.`,
        };
    } catch {
        try {
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            if (response.type === 'opaque') {
                return { value: url, status: response.status, error: undefined };
            }
            return {
                value: url,
                status: response.status,
                error: `Unexpected response code ${response.status} from ${url}.`,
            };
        } catch (error) {
            return {
                value: url,
                status: undefined,
                error: `An error occurred when fetching ${url}. ${error}`,
            };
        }
    }
}

const parseField = (
    parser: {
        safeParse: (value: string) => {
            success: boolean;
            error?: { message?: string };
        };
    },
    value: string,
): validationType => {
    const result = parser.safeParse(value);
    return result.success
        ? { value, error: undefined }
        : { value: undefined, error: result.error?.message };
};

const getValidationResults = async (): Promise<{
    [key: string]: validationType;
}> => {
    const results: { [key: string]: validationType } = {
        environment: parseField(EnvironmentEnum, window.env.REACT_APP_ENVIRONMENT),
        url: await urlIsReachable(window.env.REACT_APP_URL),
        url_basename: parseField(PathString, window.env.REACT_APP_URL_BASENAME),
        url_dtlink: parseField(PathString, window.env.REACT_APP_URL_DTLINK),
        url_liblink: parseField(PathString, window.env.REACT_APP_URL_LIBLINK),
        workbenchlink_vncdesktop: parseField(
            PathString,
            window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
        ),
        workbenchlink_vscode: parseField(
            PathString,
            window.env.REACT_APP_WORKBENCHLINK_VSCODE,
        ),
        workbenchlink_jupyterlab: parseField(
            PathString,
            window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
        ),
        workbenchlink_jupyternotebook: parseField(
            PathString,
            window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
        ),
        client_id: parseField(PathString, window.env.REACT_APP_CLIENT_ID),
        auth_authority: await urlIsReachable(window.env.REACT_APP_AUTH_AUTHORITY),
        redirect_uri: await urlIsReachable(window.env.REACT_APP_REDIRECT_URI),
        logout_redirect_uri: await urlIsReachable(
            window.env.REACT_APP_LOGOUT_REDIRECT_URI,
        ),
        gitlab_scopes: parseField(ScopesString, window.env.REACT_APP_GITLAB_SCOPES),
    };
    return results;
};

const configIcon = (validation: validationType, label: string): JSX.Element => {
    const root = document.getElementById('root');
    if (!validation.error) {
        const statusMessage = ` ${validation.status !== undefined ? `${validation.value} responded with status code ${validation.status}.` : ``}`;
        return validation.status === undefined ||
            (validation.status >= 200 && validation.status < 300) ? (
            <Tooltip title={`${label} field is configured correctly. ${statusMessage}`} PopperProps={{ container: root }}>
                <CheckCircleIcon color="success" />
            </Tooltip>
        ) : (
            <Tooltip
                title={`${label} field may not be configured correctly. ${statusMessage}`}
                PopperProps={{ container: root }}
            >
                <ErrorOutlineIcon color="warning" />
            </Tooltip>
        );
    }
    return (
        <Tooltip title={`${label} threw the following error: ${validation.error}`} PopperProps={{ container: root }}>
            <ErrorOutlineIcon color="error" />
        </Tooltip>
    );
};

const ConfigItem: React.FC<{
    label: string;
    value: string;
    validation?: validationType;
}> = React.memo(
    ({ label, value, validation = { error: 'Validation is not available' } }) => (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '5px 0',
            }}
        >
            {configIcon(validation, label)}
            <div>
                <strong>{label}:</strong> {value}
            </div>
        </div>
    ),
);
ConfigItem.displayName = 'ConfigItem';

const VerifyConfig: React.FC = () => {
    const [validationResults, setValidationResults] = React.useState<{
        [key: string]: validationType;
    }>({});

    React.useEffect(() => {
        const fetchValidations = async () => {
            const results = await getValidationResults();
            setValidationResults(results);
        };
        fetchValidations();
    }, []);

    const configItems = [
        {
            label: 'APP ENVIRONMENT',
            value: window.env.REACT_APP_ENVIRONMENT,
            key: 'environment',
        },
        { label: 'APP URL', value: window.env.REACT_APP_URL, key: 'url' },
        {
            label: 'APP URL BASENAME',
            value: window.env.REACT_APP_URL_BASENAME,
            key: 'url_basename',
        },
        {
            label: 'APP URL DTLINK',
            value: window.env.REACT_APP_URL_DTLINK,
            key: 'url_dtlink',
        },
        {
            label: 'APP URL LIBLINK',
            value: window.env.REACT_APP_URL_LIBLINK,
            key: 'url_liblink',
        },
        {
            label: 'WORKBENCHLINK VNCDESKTOP',
            value: window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP,
            key: 'workbenchlink_vncdesktop',
        },
        {
            label: 'WORKBENCHLINK VSCODE',
            value: window.env.REACT_APP_WORKBENCHLINK_VSCODE,
            key: 'workbenchlink_vscode',
        },
        {
            label: 'WORKBENCHLINK JUPYTERLAB',
            value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB,
            key: 'workbenchlink_jupyterlab',
        },
        {
            label: 'WORKBENCHLINK JUPYTERNOTEBOOK',
            value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
            key: 'workbenchlink_jupyternotebook',
        },
        {
            label: 'CLIENT ID',
            value: window.env.REACT_APP_CLIENT_ID,
            key: 'client_id',
        },
        {
            label: 'AUTH AUTHORITY',
            value: window.env.REACT_APP_AUTH_AUTHORITY,
            key: 'auth_authority',
        },
        {
            label: 'REDIRECT URI',
            value: window.env.REACT_APP_REDIRECT_URI,
            key: 'redirect_uri',
        },
        {
            label: 'LOGOUT REDIRECT URI',
            value: window.env.REACT_APP_LOGOUT_REDIRECT_URI,
            key: 'logout_redirect_uri',
        },
        {
            label: 'GITLAB SCOPES',
            value: window.env.REACT_APP_GITLAB_SCOPES,
            key: 'gitlab_scopes',
        },
    ];

    return (
        <Paper
            sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            <Typography variant="h4">Configuration Verification</Typography>
            <div>
                {configItems.map(({ label, value, key }) => (
                    <ConfigItem
                        key={key}
                        label={label}
                        value={value}
                        validation={validationResults[key]}
                    />
                ))}
            </div>
        </Paper>
    );
};

export default VerifyConfig;

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

const VerifyConfig = () => {
    const [validationResults, setValidationResults] = React.useState<{
        [key: string]: validationType;
    }>({});

    React.useEffect(() => {
        const checkValidations = async () => {
            const results: { [key: string]: validationType } = {};
            results.environment = EnvironmentEnum.safeParse(
                window.env.REACT_APP_ENVIRONMENT
            ).success
                ? { value: window.env.REACT_APP_ENVIRONMENT, error: undefined }
                : { value: undefined, error: EnvironmentEnum.safeParse(window.env.REACT_APP_ENVIRONMENT).error?.message };

            results.url = await urlIsReachable(window.env.REACT_APP_URL);
            results.url_basename = PathString.safeParse(
                window.env.REACT_APP_URL_BASENAME
            ).success
                ? { value: window.env.REACT_APP_URL_BASENAME, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_URL_BASENAME).error?.message };

            results.url_dtlink = PathString.safeParse(
                window.env.REACT_APP_URL_DTLINK
            ).success
                ? { value: window.env.REACT_APP_URL_DTLINK, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_URL_DTLINK).error?.message };

            results.url_liblink = PathString.safeParse(
                window.env.REACT_APP_URL_LIBLINK
            ).success
                ? { value: window.env.REACT_APP_URL_LIBLINK, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_URL_LIBLINK).error?.message };

            results.workbenchlink_vncdesktop = PathString.safeParse(
                window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP
            ).success
                ? { value: window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP).error?.message };

            results.workbenchlink_vscode = PathString.safeParse(
                window.env.REACT_APP_WORKBENCHLINK_VSCODE
            ).success
                ? { value: window.env.REACT_APP_WORKBENCHLINK_VSCODE, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_WORKBENCHLINK_VSCODE).error?.message };

            results.workbenchlink_jupyterlab = PathString.safeParse(
                window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB
            ).success
                ? { value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB).error?.message };

            results.workbenchlink_jupyternotebook = PathString.safeParse(
                window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK
            ).success
                ? { value: window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK).error?.message };

            results.client_id = PathString.safeParse(
                window.env.REACT_APP_CLIENT_ID
            ).success
                ? { value: window.env.REACT_APP_CLIENT_ID, error: undefined }
                : { value: undefined, error: PathString.safeParse(window.env.REACT_APP_CLIENT_ID).error?.message };

            results.auth_authority = await urlIsReachable(
                window.env.REACT_APP_AUTH_AUTHORITY
            );

            results.redirect_uri = await urlIsReachable(
                window.env.REACT_APP_REDIRECT_URI
            );

            results.logout_redirect_uri = await urlIsReachable(
                window.env.REACT_APP_LOGOUT_REDIRECT_URI
            );

            results.gitlab_scopes = ScopesString.safeParse(
                window.env.REACT_APP_GITLAB_SCOPES
            ).success
                ? { value: window.env.REACT_APP_GITLAB_SCOPES, error: undefined }
                : { value: undefined, error: ScopesString.safeParse(window.env.REACT_APP_GITLAB_SCOPES).error?.message };

            setValidationResults(results);
        };
        checkValidations();
    }, []);

    const getIcon = (validation: validationType, label: string, root: HTMLElement | null) => {
        if (!validation.error) {
            const title = `${label} field is configured correctly. ${validation.status !== undefined ? `${validation.value} responded with status code ${validation.status}.` : ``}`;
            return validation.status === undefined || (validation.status >= 200 && validation.status < 300)
                ? <Tooltip title={title} PopperProps={{ container: root }}><CheckCircleIcon color="success" /></Tooltip>
                : <Tooltip title={`${label} field may not be configured correctly.`} PopperProps={{ container: root }}><ErrorOutlineIcon color="warning" /></Tooltip>;
        }
        return <Tooltip title={validation.error} PopperProps={{ container: root }}><ErrorOutlineIcon color="error" /></Tooltip>;
    };

    const ConfigItem = React.memo(({ label, value, validation = { error: 'Validation not available' } }: {
        label: string;
        value: string;
        validation?: validationType;
    }) => {
        const root = document.getElementById('root');
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '5px 0' }}>
                {getIcon(validation, label, root)}
                <div>
                    <strong>{label}:</strong> {value}
                </div>
            </div>
        );
    });
    ConfigItem.displayName = 'ConfigItem';

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
                <ConfigItem
                    label="APP ENVIRONMENT"
                    value={window.env.REACT_APP_ENVIRONMENT}
                    validation={validationResults.environment}
                />
                <ConfigItem
                    label="APP URL"
                    value={window.env.REACT_APP_URL}
                    validation={validationResults.url}
                />
                <ConfigItem
                    label="APP URL BASENAME"
                    value={window.env.REACT_APP_URL_BASENAME}
                    validation={validationResults.url_basename}
                />
                <ConfigItem
                    label="APP URL DTLINK"
                    value={window.env.REACT_APP_URL_DTLINK}
                    validation={validationResults.url_dtlink}
                />
                <ConfigItem
                    label="APP URL LIBLINK"
                    value={window.env.REACT_APP_URL_LIBLINK}
                    validation={validationResults.url_liblink}
                />
                <ConfigItem
                    label="WORKBENCHLINK VNCDESKTOP"
                    value={window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP}
                    validation={validationResults.workbenchlink_vncdesktop}
                />
                <ConfigItem
                    label="WORKBENCHLINK VSCODE"
                    value={window.env.REACT_APP_WORKBENCHLINK_VSCODE}
                    validation={validationResults.workbenchlink_vscode}
                />
                <ConfigItem
                    label="WORKBENCHLINK JUPYTERLAB"
                    value={window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB}
                    validation={validationResults.workbenchlink_jupyterlab}
                />
                <ConfigItem
                    label="WORKBENCHLINK JUPYTERNOTEBOOK"
                    value={window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK}
                    validation={validationResults.workbenchlink_jupyternotebook}
                />
                <ConfigItem
                    label="CLIENT ID"
                    value={window.env.REACT_APP_CLIENT_ID}
                    validation={validationResults.client_id}
                />
                <ConfigItem
                    label="AUTH AUTHORITY"
                    value={window.env.REACT_APP_AUTH_AUTHORITY}
                    validation={validationResults.auth_authority}
                />
                <ConfigItem
                    label="REDIRECT URI"
                    value={window.env.REACT_APP_REDIRECT_URI}
                    validation={validationResults.redirect_uri}
                />
                <ConfigItem
                    label="LOGOUT REDIRECT URI"
                    value={window.env.REACT_APP_LOGOUT_REDIRECT_URI}
                    validation={validationResults.logout_redirect_uri}
                />
                <ConfigItem
                    label="GITLAB SCOPES"
                    value={window.env.REACT_APP_GITLAB_SCOPES}
                    validation={validationResults.gitlab_scopes}
                />
            </div>
        </Paper>
    );
};

export default VerifyConfig;
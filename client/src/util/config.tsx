import { z } from 'zod';
import * as React from 'react';
import { Paper, Typography } from '@mui/material';
import { ConfigItem } from 'route/auth/ConfigItems';

const EnvironmentEnum = z.enum(['dev', 'local', 'prod', 'test']);
const PathString = z.string();
const ScopesString = z.literal('openid profile read_user read_repository api');

const VerifyConfig: React.FC<{ keys?: string[]; title?: string }> = ({
    keys = [],
    title = 'Config verification',
}) => {
    const [validationResults, setValidationResults] = React.useState<{
        [key: string]: validationType;
    }>({});

    React.useEffect(() => {
        const fetchValidations = async () => {
            const results = await getValidationResults(keys);
            setValidationResults(results);
        };
        fetchValidations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayedConfigs: Partial<typeof window.env> =
        keys.length === 0
            ? window.env
            : Object.fromEntries(
                keys
                    .filter((key) => key in window.env)
                    .map((key) => [
                        key,
                        window.env[
                        key as keyof typeof window.env
                        ] as string,
                    ]),
            );

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
            <Typography variant="h4">{title}</Typography>
            <div id="config-items">
                {Object.entries(displayedConfigs).map(([key, value]) => (
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
};

export type validationType = {
    value?: string;
    status?: number;
    error?: string;
};

async function opaqueRequest(url: string): Promise<validationType> {
    const urlValidation: validationType = {
        value: url,
        status: undefined,
        error: undefined,
    };
    try {
        await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(1000),
        });
        urlValidation.status = 0;
    } catch (error) {
        urlValidation.error = `An error occurred when fetching ${url}: ${error}`;
    }
    return urlValidation;
}

async function corsRequest(url: string): Promise<validationType> {
    const urlValidation: validationType = {
        value: url,
        status: undefined,
        error: undefined,
    };
    const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000),
    });
    const responseIsAcceptable = response.ok || response.status === 302;
    if (!responseIsAcceptable) {
        urlValidation.error = `Unexpected response code ${response.status} from ${url}.`;
    }
    urlValidation.status = response.status;
    return urlValidation;
}

async function urlIsReachable(url: string): Promise<validationType> {
    let urlValidation: validationType;
    try {
        urlValidation = await corsRequest(url);
    } catch {
        urlValidation = await opaqueRequest(url);
    }
    return urlValidation;
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

export const getValidationResults = async (
    keysToValidate: string[],
): Promise<{
    [key: string]: validationType;
}> => {
    const allVerifications = {
        REACT_APP_ENVIRONMENT: Promise.resolve(
            parseField(EnvironmentEnum, window.env.REACT_APP_ENVIRONMENT),
        ),
        REACT_APP_URL: urlIsReachable(window.env.REACT_APP_URL),
        REACT_APP_URL_BASENAME: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_URL_BASENAME),
        ),
        REACT_APP_URL_DTLINK: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_URL_DTLINK),
        ),
        REACT_APP_URL_LIBLINK: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_URL_LIBLINK),
        ),
        REACT_APP_WORKBENCHLINK_VNCDESKTOP: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VNCDESKTOP),
        ),
        REACT_APP_WORKBENCHLINK_VSCODE: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_VSCODE),
        ),
        REACT_APP_WORKBENCHLINK_JUPYTERLAB: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_JUPYTERLAB),
        ),
        REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: Promise.resolve(
            parseField(
                PathString,
                window.env.REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK,
            ),
        ),
        REACT_APP_CLIENT_ID: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_CLIENT_ID),
        ),
        REACT_APP_AUTH_AUTHORITY: urlIsReachable(window.env.REACT_APP_AUTH_AUTHORITY),
        REACT_APP_REDIRECT_URI: urlIsReachable(window.env.REACT_APP_REDIRECT_URI),
        REACT_APP_LOGOUT_REDIRECT_URI: urlIsReachable(
            window.env.REACT_APP_LOGOUT_REDIRECT_URI,
        ),
        REACT_APP_GITLAB_SCOPES: Promise.resolve(
            parseField(ScopesString, window.env.REACT_APP_GITLAB_SCOPES),
        ),
        REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW),
        ),
        REACT_APP_WORKBENCHLINK_DT_PREVIEW: Promise.resolve(
            parseField(PathString, window.env.REACT_APP_WORKBENCHLINK_DT_PREVIEW),
        ),
    };

    const verifications =
        keysToValidate.length === 0
            ? allVerifications
            : Object.fromEntries(
                keysToValidate
                    .filter((key) => key in allVerifications)
                    .map((key) => [
                        key,
                        allVerifications[key as keyof typeof allVerifications],
                    ]),
            );

    const results = await Promise.all(
        Object.entries(verifications).map(async ([key, task]) => ({
            [key]: await task,
        })),
    );

    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
};

export default VerifyConfig
import type Config from './config.service.js';

/**
 * Settings that let the gateway start but leave it weaker or useless, logged
 * once at startup so an installer sees them before the first request.
 */
export default function startupWarnings(config: Config): string[] {
  const warnings: string[] = [];
  if (config.get('gitlab-url') === '') {
    warnings.push(
      'gitlab-url is not set: every request with a token is refused',
    );
  }
  // Without the client id the gateway accepts any GitLab token of the user,
  // including one issued to an unrelated OAuth application.
  if (config.get('gitlab-client-id') === '') {
    warnings.push(
      'gitlab-client-id is not set: tokens of every OAuth application are accepted. ' +
        'Set it to the Application ID of the DTaaS client, REACT_APP_CLIENT_ID in client.js',
    );
  }
  return warnings;
}

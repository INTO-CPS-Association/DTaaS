import type Config from './config.service.js';

// Without the client id the gateway accepts any GitLab token of the user,
// including one issued to an unrelated OAuth application.
function acceptsAnyClient(config: Config): boolean {
  return (
    config.get('gitlab-url') !== '' && config.get('gitlab-client-id') === ''
  );
}

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
  if (acceptsAnyClient(config) && config.get('allow-any-gitlab-client')) {
    warnings.push(
      'gitlab-client-id is not set and allow-any-gitlab-client is on: tokens of every OAuth application are accepted. ' +
        'Use this only on a local development stack',
    );
  }
  if (config.get('owners-file') === '') {
    warnings.push(
      'owners-file is not set: no topic is served, since no topic can be tied to its owner',
    );
  }
  if (
    config.get('oidc-providers').length > 0 &&
    config.get('gitlab-token-file') === ''
  ) {
    warnings.push(
      'oidc-providers is set without gitlab-token-file: users signed in through Keycloak or Dex read nothing',
    );
  }
  return warnings;
}

/**
 * Settings the gateway refuses to start with. An empty gitlab-client-id is
 * one of them unless allow-any-gitlab-client says the stack is a local one.
 */
export function startupErrors(config: Config): string[] {
  if (!acceptsAnyClient(config) || config.get('allow-any-gitlab-client')) {
    return [];
  }
  return [
    'gitlab-client-id is not set, so tokens of every OAuth application would be accepted. ' +
      'Set it to the Application ID of the DTaaS client, REACT_APP_CLIENT_ID in client.js, ' +
      'or set allow-any-gitlab-client to true on a local development stack',
  ];
}

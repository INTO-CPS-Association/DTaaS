import { z } from 'zod';
import type GitLabClient from '../auth/gitlab.client.js';
import type Config from './config.service.js';
import readSecretFile from './secrets.js';

// GitLab reports the scopes of the access token that makes the request.
const SELF = 'api/v4/personal_access_tokens/self';

const selfSchema = z.object({ scopes: z.array(z.string()) });

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Warnings about the gateway's own GitLab token, checked once after start.
 *
 * That token reads the twins of every Keycloak and Dex user, so a scope
 * beyond read_api would let a fault in the gateway change GitLab. The check
 * only warns: GitLab may be unreachable at start, and the token is read again
 * on each use, so a rotated file takes effect without a restart.
 */
export default async function ownTokenWarnings(
  config: Config,
  gitlab: GitLabClient,
): Promise<string[]> {
  const file = config.get('gitlab-token-file');
  if (file === '' || !gitlab.isConfigured()) return [];
  try {
    const token = await readSecretFile(file, 'gitlab-token-file');
    const { scopes } = selfSchema.parse(await gitlab.getJson(SELF, token));
    const extra = scopes.filter((scope) => scope !== 'read_api');
    if (extra.length === 0) return [];
    return [
      `gitlab-token-file has scopes beyond read_api (${extra.join(', ')}): ` +
        'create a token with the read_api scope only',
    ];
  } catch (error) {
    return [
      `The scopes of gitlab-token-file could not be checked: ${messageOf(error)}`,
    ];
  }
}

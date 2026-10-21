/**
 * The `git` host service: GitLab under the signed-in user's OAuth session.
 *
 * The client already signs in to GitLab, keeps the access token through
 * `@into-cps-association/dt-automation` and reads the GitLab address from
 * `env.js`. This service reuses both, so an extension never handles a token.
 * Content travels base64 encoded both ways, since a model or a binary asset is
 * not safe inside a JSON string.
 */

import { Gitlab } from '@gitbeaker/rest';
import { getAccessToken } from '@into-cps-association/dt-automation';
import type {
  CommitResult,
  FileChange,
  GitService,
} from '@into-cps-association/dtaas-sdk';
import { getAuthority } from 'util/envUtil';
import { toBase64 } from 'extension/contentsUpload';

/** The part of the GitLab API this service uses, so tests can stand in. */
export interface GitApi {
  RepositoryFiles: {
    show(repo: string, path: string, ref: string): Promise<{ content: string }>;
  };
  Commits: {
    create(
      repo: string,
      branch: string,
      message: string,
      actions: Record<string, unknown>[],
    ): Promise<{ id: string }>;
  };
}

/** A GitLab client for the signed-in user, made when a call needs it. */
export function sessionApi(): GitApi {
  return new Gitlab({
    host: getAuthority(),
    oauthToken: getAccessToken(),
  }) as unknown as GitApi;
}

function fromBase64(content: string): Uint8Array {
  return Uint8Array.from(atob(content), (char) => char.codePointAt(0) ?? 0);
}

/** One file change in the shape the GitLab commits API takes. */
export function commitAction(change: FileChange): Record<string, unknown> {
  const action: Record<string, unknown> = {
    action: change.action,
    filePath: change.path,
  };
  if (change.previousPath) action.previousPath = change.previousPath;
  if (typeof change.content === 'string') {
    action.content = change.content;
  } else if (change.content) {
    action.content = toBase64(change.content);
    action.encoding = 'base64';
  }
  return action;
}

/**
 * The git service. `api` is made per call, so a token refreshed after sign-in
 * is the one used.
 */
export default function createGitService(
  api: () => GitApi = sessionApi,
): GitService {
  return {
    async read(repo, path, ref = 'main') {
      const file = await api().RepositoryFiles.show(repo, path, ref);
      return fromBase64(file.content);
    },
    async commit(repo, branch, changes, message): Promise<CommitResult> {
      const commit = await api().Commits.create(
        repo,
        branch,
        message,
        changes.map(commitAction),
      );
      return { sha: commit.id };
    },
  };
}

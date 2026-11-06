/**
 * The visualisation.json of a twin as committed in GitLab.
 *
 * The signals gateway decides what a user may read from the committed copy
 * on the configured branch, and never from the workspace. The Visualise tab
 * reads the same copy, so the signals it asks for are the ones the gateway
 * serves, and an edit that is not committed yet is not drawn.
 */

import type {
  HostServices,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import { GitFileMissing } from 'extension/gitClient';
import { VISUALISATION_FILE, parseVisualisationFile } from 'viz/vizService';

/** Reads the committed declaration of one twin, or null when it has none. */
export type ReadDeclaration = (
  twin: string,
) => Promise<VisualisationAsset | null>;

type Sources = Pick<HostServices, 'auth' | 'git' | 'settings'>;

function setting(sources: Sources, key: string): string {
  const value = sources.settings.get<string>(key);
  if (!value) throw new Error(`The ${key} setting is empty`);
  return value;
}

/** The project of the signed-in user and where its twins are committed. */
async function locationOf(sources: Sources) {
  const { username } = await sources.auth.user();
  return {
    // Each user's twins live in their own project of the DTaaS group, as the
    // gateway assumes with gitlab-group.
    repo: `${setting(sources, 'GROUP_NAME')}/${username}`,
    branch: setting(sources, 'BRANCH_NAME'),
    directory: setting(sources, 'DT_DIRECTORY'),
  };
}

export default function committedReader(sources: Sources): ReadDeclaration {
  return async (twin) => {
    const { repo, branch, directory } = await locationOf(sources);
    const path = `${directory}/${twin}/${VISUALISATION_FILE}`;
    let bytes: Uint8Array;
    try {
      bytes = await sources.git.read(repo, path, branch);
    } catch (error) {
      if (error instanceof GitFileMissing) return null;
      throw error;
    }
    return parseVisualisationFile(bytes, `${repo}@${branch}:${path}`);
  };
}

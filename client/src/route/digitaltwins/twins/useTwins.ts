/**
 * The digital twins of the signed-in user, as the folders of the twins
 * directory of the workspace, with what the host knows about one of them.
 */

import { useEffect, useState } from 'react';
import type {
  ContentsService,
  DigitalTwinSummary,
} from '@into-cps-association/dtaas-sdk';

/**
 * The detail of a failure goes to the console, where a developer looks, and
 * the page shows a plain sentence, since the detail may name server paths.
 */
export function logged(what: string, reason: Error): string {
  // eslint-disable-next-line no-console
  console.warn(what, reason);
  return reason.message;
}

/** The folders of the twins directory, or the error that listing gave. */
export function useTwins(contents: ContentsService, directory: string) {
  const [twins, setTwins] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    contents
      .list(directory)
      .then((entries) =>
        setTwins(
          entries.filter((e) => e.type === 'directory').map((e) => e.name),
        ),
      )
      .catch((reason: Error) =>
        setError(logged('The digital twins could not be listed.', reason)),
      );
  }, [contents, directory]);
  return { twins, error };
}

/** The files of one twin's folder, as an extension sees the twin. */
export async function twinSummary(
  contents: ContentsService,
  directory: string,
  name: string,
): Promise<DigitalTwinSummary> {
  const path = `${directory}/${name}`;
  const entries = await contents.list(path);
  const files = entries.filter((e) => e.type === 'file').map((e) => e.name);
  return { name, path, files };
}

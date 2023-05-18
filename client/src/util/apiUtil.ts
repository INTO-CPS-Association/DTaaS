import { useLazyLoadQuery } from 'react-relay';
import { gitLabQueriesgitLabDirectoryListQuery } from 'util/queries/__generated__/gitLabQueriesgitLabDirectoryListQuery.graphql';
import { getGitlabGroup } from 'util/envUtil';
import { Asset } from 'models/Asset';
import useUserData from 'store/UserAccess';
import getFilesQuery from './queries/gitLabQueries';

const mapToAssets = (
  arr: { name: string; path: string }[],
  isDir: boolean
): Asset[] =>
  arr
    .filter((node): node is { name: string; path: string } => node != null)
    .map(({ name, path }) => ({
      name,
      path,
      isDir,
    })) as Asset[];

type entry = {
  name: string;
  path: string;
};

/**
 * Retrives a list of assets from the given directory path in a GitLab repository.
 * Uses ENV variables to deterimine the group and graphQL endpoint for requests.
 * The project must be the same as the username used for logging in.
 * @param dirPath relative path to the directory in the repository
 * @returns An array of `Asset` objects
 */
function useAssets(dirPath: string, privateRepo?: boolean): Asset[] {
  const data = useLazyLoadQuery<gitLabQueriesgitLabDirectoryListQuery>(
    getFilesQuery,
    {
      path: dirPath,
      groupAndProject: `${getGitlabGroup()}/${
        privateRepo ? useUserData().state.userName : 'Common'
      }`,
    }
  );

  const nodes = data.project?.repository?.paginatedTree?.nodes ?? [];
  if (nodes.length === 0) {
    return [];
  }

  return [
    ...mapToAssets(
      nodes.flatMap((node) => node?.blobs?.nodes ?? []) as entry[],
      false
    ),
    ...mapToAssets(
      nodes.flatMap((node) => node?.trees?.nodes ?? []) as entry[],
      true
    ),
  ];
}

export default useAssets;

import { useLazyLoadQuery } from 'react-relay';
import { getGitlabGroup } from 'util/envUtil';
import { Asset } from 'components/asset/Asset';
import useUserData from 'store/UserAccess';
import {
  gitLabDirectoryListQuery,
  gitLabDirectoryListQuery$data,
} from 'util/queries/__generated__/gitLabDirectoryListQuery.graphql';
import {
  gitLabReadmeQuery,
  gitLabReadmeQuery$data,
} from 'util/queries/__generated__/gitLabReadmeQuery.graphql';
import { getDirectoriesQuery, getReadmesQuery } from './queries/gitLab';

type GitLabQueryData = NonNullable<gitLabDirectoryListQuery$data>;
type Project = NonNullable<GitLabQueryData['project']>;
type Repository = NonNullable<Project['repository']>;
type PaginatedTree = NonNullable<Repository['paginatedTree']>;
type TreeNodes = NonNullable<NonNullable<PaginatedTree['nodes']>[0]>;
type Trees = NonNullable<TreeNodes['trees']>;
type TreeNodesArray = NonNullable<Trees['nodes']>;

let errorMessage: string;

/**
 * Retrives a list of assets from the given directory path in a GitLab repository.
 * Uses ENV variables to deterimine the group and graphQL endpoint for requests.
 * The project must be the same as the username used for logging in.
 * @param dirPath relative path to the directory in the repository
 * @returns data: An array of `Asset` objects. errorMessage: Any potential error messages.
 */
function useAssets(
  dirPath: string,
  privateRepo?: boolean
): { data: Asset[]; errorMessage?: string } {
  const groupAndProject = getGroupAndProject(privateRepo);

  const dirData = useDirectoryData(dirPath, groupAndProject);
  const repository = validateRepository(dirData, groupAndProject);

  if (!repository) {
    return { data: [], errorMessage };
  }

  const directories = validateDirectories(repository, dirPath);

  if (!directories) {
    return { data: [], errorMessage };
  }

  const assets = createAssets(directories);

  const readmeData = getReadmesData(assets, groupAndProject);
  return { data: mergeAssets(assets, readmeData) };
}

function getGroupAndProject(privateRepo?: boolean): string {
  return `${getGitlabGroup()}/${
    privateRepo ? useUserData().state.userName : 'Common'
  }`;
}

function useDirectoryData(dirPath: string, groupAndProject: string) {
  return useLazyLoadQuery<gitLabDirectoryListQuery>(getDirectoriesQuery, {
    path: dirPath,
    groupAndProject,
  });
}

function validateRepository(
  dirData: gitLabDirectoryListQuery$data,
  groupAndProject: string
): Repository | null {
  if (dirData.project && dirData.project.repository) {
    return dirData.project.repository;
  }

  errorMessage = `Repository not found, check project and group exists on gitlab.
       Current group/project: ${groupAndProject}`;
  return null;
}

function validateDirectories(
  repository: Repository,
  dirPath: string
): TreeNodesArray | null {
  const nodes = repository.paginatedTree?.nodes?.[0]?.trees?.nodes;

  if (nodes) {
    return nodes;
  }

  errorMessage = `Directory not found, check directory path. Current path: ${dirPath}`;
  return null;
}

function createAssets(treeNodes: TreeNodesArray): Asset[] {
  const assets: Asset[] = [];

  treeNodes.forEach((node) => {
    if (!node) return;
    assets.push({
      name: node.name,
      path: node.path,
    });
  });

  return assets;
}

export default useAssets;

function getReadmesData(dirPaths: Asset[], groupAndProject: string) {
  const paths = dirPaths.map((dir) => `${dir.path}/README.md`);
  return useLazyLoadQuery<gitLabReadmeQuery>(getReadmesQuery, {
    paths,
    groupAndProject,
  });
}

function mergeAssets(
  assets: Asset[],
  readmeData: gitLabReadmeQuery$data
): Asset[] {
  const nodes =
    readmeData &&
    readmeData.project &&
    readmeData.project.repository &&
    readmeData.project.repository.blobs &&
    readmeData.project.repository.blobs.nodes;

  if (nodes) {
    nodes.forEach((node) => {
      if (node === null) return;
      assets
        .filter((asset) => node.path.startsWith(asset.path))
        .forEach((asset) => {
          assets.splice(assets.indexOf(asset), 1, {
            ...asset,
            description: node.rawTextBlob ?? '',
          });
        });
    });
    return assets;
  }
  throw new Error(
    `Critical error: readme nodes not found. Should never happen, as they been verified on previous steps.`
  );
}

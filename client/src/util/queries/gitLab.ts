import graphql from 'babel-plugin-relay/macro';

// GraphQL query to retrieve the paginated tree of the repository at the specified path and return the nodes that represent the directories in the tree
export const getDirectoriesQuery = graphql`
  query gitLabDirectoryListQuery($path: String!, $groupAndProject: ID!) {
    project(fullPath: $groupAndProject) {
      repository {
        paginatedTree(path: $path, recursive: false) {
          nodes {
            trees {
              nodes {
                name # name of the directory
                path # path of the directory
              }
            }
          }
        }
      }
    }
  }
`;

// GraphQL query to retrieve the blobs of the repository at the specified paths and return the nodes that represent the files in the blobs
export const getReadmesQuery = graphql`
  query gitLabReadmeQuery($paths: [String!]!, $groupAndProject: ID!) {
    project(fullPath: $groupAndProject) {
      repository {
        blobs(paths: $paths) {
          nodes {
            rawTextBlob # raw text of the file
            name # name of the file
            path # path of the file
            fileType # type of the file
          }
        }
      }
    }
  }
`;

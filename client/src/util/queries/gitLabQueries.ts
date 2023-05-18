import graphql from 'babel-plugin-relay/macro';

const getFilesQuery = graphql`
  query gitLabQueriesgitLabDirectoryListQuery(
    $path: String!
    $groupAndProject: ID!
  ) {
    project(fullPath: $groupAndProject) {
      webUrl
      path
      repository {
        paginatedTree(path: $path, recursive: false) {
          nodes {
            blobs {
              nodes {
                name
                path
              }
            }
            trees {
              nodes {
                name
                path
              }
            }
          }
        }
      }
    }
  }
`;

export default getFilesQuery;

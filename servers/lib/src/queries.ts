import { gql } from "@apollo/client/core";

export const DIRECTORY_LIST = gql`
  query directoryList($path: String!, $domain: ID!) {
    project(fullPath: $domain) {
      webUrl
      path
      repository {
        paginatedTree(path: $path, recursive: false) {
          nodes {
            trees {
              nodes {
                name
              }
            }
          }
        }
        diskPath
      }
    }
  }
`;

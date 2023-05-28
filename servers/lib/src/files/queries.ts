import { gql } from "@apollo/client/core";

export const LIST_DIRECTORY = gql`
  query listDirectory($path: String, $domain: ID!) {
    project(fullPath: $domain) {
      repository {
        tree(path: $path, recursive: false) {
          blobs {
            edges {
              node {
                name
                type
              }
            }
          }
          trees {
            edges {
              node {
                name
                type
              }
            }
          }
        }
      }
    }
  }
`;

export const READ_FILE = gql`
  query readFile($domain: ID!, $path: [String!]!) {
    project(fullPath: $domain) {
      repository {
        blobs(paths: $path) {
          nodes {
            name
            rawBlob
            rawTextBlob
          }
        }
      }
    }
  }
`;

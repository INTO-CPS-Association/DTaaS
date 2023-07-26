export const getDirectoryQuery = (domain: string, parsedPath: string) => `
  query listDirectory {
    project(fullPath: "${domain}") {
      repository {
        tree(path: "${parsedPath}", recursive: false) {
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

export const getReadFileQuery = (domain: string, parsedPath: string) => `
  query readFile {
    project(fullPath: "${domain}") {
      repository {
        blobs(paths: "${parsedPath}") {
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

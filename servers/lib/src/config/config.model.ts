// export type ConfigValues = {
//   port: number;
//   'local-path': string;
//   mode: string;
//   'log-level': string;
//   'apollo-path': string;
//   'graphql-playground': string;
//   'git-repos': { [key: string]: GitRepo }[];
// };

export interface GitRepo {
  'repo-url': string;
  'http-token'?: string;
}

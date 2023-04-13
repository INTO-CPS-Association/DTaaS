export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_ENVIRONMENT: string;
      REACT_APP_URL_LIB: string;
      REACT_APP_URL_DT: string;
      REACT_APP_URL_WORKBENCH: string;

      REACT_APP_CLIENT_ID: string;
      REACT_APP_CLIENT_SECRET: string;
      REACT_APP_INIT_URL: string;
      REACT_APP_REDIRECT_URL: string;
      REACT_APP_REQUESTED_SCOPES: string;

      REACT_APP_GITLAB_OAUTH_TOKEN: string;
      REACT_APP_GITLAB_API_GRAPHQL: string;
    }
  }

  interface Window {
    env: NodeJS.ProcessEnv;
  }
}
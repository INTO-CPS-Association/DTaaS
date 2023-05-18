export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_ENVIRONMENT: string;
      REACT_APP_URL: string;
      REACT_APP_URL_BASENAME: string;
      REACT_APP_URL_DTLINK: string;
      REACT_APP_URL_LIBLINK: string;
      REACT_APP_WORKBENCHLINK_TERMINAL: string;
      REACT_APP_WORKBENCHLINK_VNCDESKTOP: string;
      REACT_APP_WORKBENCHLINK_VSCODE: string;
      REACT_APP_WORKBENCHLINK_JUPYTERLAB: string;
      REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: string;

      REACT_APP_CLIENT_ID: string;
      REACT_APP_AUTH_AUTHORITY: string;
      REACT_APP_REDIRECT_URI: string;
      REACT_APP_LOGOUT_REDIRECT_URI: string;
      REACT_APP_GITLAB_SCOPES: string;
      REACT_APP_BACKEND_URL_GITLAB: string;
      REACT_APP_BACKEND_GITLAB_GROUP: string;
    }
  }

  interface Window {
    env: NodeJS.ProcessEnv;
  }
}

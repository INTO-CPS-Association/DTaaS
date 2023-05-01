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
      REACT_APP_URL_LIB: string;
      REACT_APP_URL_DT: string;
      REACT_APP_URL_WORKBENCH: string;

      REACT_APP_CLIENT_ID: string;
      REACT_APP_AUTH_AUTHORITY: string;
    }
  }

  interface Window {
    env: NodeJS.ProcessEnv;
  }
}

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_ENVIRONMENT: string;
      REACT_APP_URL_LIB: string;
      REACT_APP_URL_DT: string;
      REACT_APP_URL_WORKBENCH: string;
    }
  }

  interface Window {
    env: NodeJS.ProcessEnv;
  }
}

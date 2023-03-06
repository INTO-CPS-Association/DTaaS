export{}

declare global {
    namespace NodeJS {
      interface ProcessEnv {
        REACT_APP_ENVIRONMENT: string;
        REACT_APP_JUPYTER_URL: string;
      }
    }
  
    interface Window {
      env: NodeJS.ProcessEnv;
    }
  }
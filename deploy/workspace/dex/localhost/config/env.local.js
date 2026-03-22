if (globalThis.window != undefined) {
  globalThis.env = {
    REACT_APP_ENVIRONMENT: 'local',
    REACT_APP_URL: 'http://localhost/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',

    REACT_APP_CLIENT_ID: 'mock',
    REACT_APP_AUTH_AUTHORITY: 'http://localhost:5556/dex',
    REACT_APP_REDIRECT_URI: 'http://localhost/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost/',
    REACT_APP_GITLAB_SCOPES: 'openid profile',
  };
};


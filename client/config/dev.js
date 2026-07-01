if (typeof window !== 'undefined') {
  window.env = {
    REACT_APP_ENVIRONMENT: 'dev',
    REACT_APP_URL: 'http://localhost:4000/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
    REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

    REACT_APP_CLIENT_ID: '85e9f08631d90700c598106979009f1ecc1c3b1ae64eb2f8decb4e0d23a4e6fe',
    REACT_APP_AUTH_AUTHORITY: 'https://dtaas-digitaltwin.com/gitlab',
    REACT_APP_REDIRECT_URI: 'http://localhost:4000/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    LOGGER_URL: 'http://localhost:4003/logger',
  };
};
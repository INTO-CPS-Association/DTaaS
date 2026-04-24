# Configure Client Website

This page describes the various configuration options for the React website.

  ```js
  if (typeof window !== 'undefined') {
    window.env = {
      REACT_APP_ENVIRONMENT: "prod | dev | local | test",
      REACT_APP_URL: "URL for the gateway",
      REACT_APP_URL_BASENAME: "Base URL for the client website"(optional, can be null),
      REACT_APP_URL_DTLINK: "Endpoint for the Digital Twin",
      REACT_APP_URL_LIBLINK: "Endpoint for the Library Assets",
      REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: 'Endpoint for the Library page preview',
      REACT_APP_WORKBENCHLINK_DT_PREVIEW: "Endpoint for the Digital Twins page preview",
      REACT_APP_CLIENT_ID: 'AppID genereated by the gitlab OAuth 2.0 provider',
      REACT_APP_AUTH_AUTHORITY: 'URL of the private gitlab instance',
      REACT_APP_REDIRECT_URI: 'URL of the homepage for the logged in users of the website',
      REACT_APP_LOGOUT_REDIRECT_URI: 'URL of the homepage for the anonymous users of the website',
      REACT_APP_GITLAB_SCOPES: 'OAuth 2.0 scopes. These should match with the scopes set in gitlab OAuth 2.0 provider',
    };
  };

  // Example values with no base URL. Trailing and ending slashes are optional.
  if (typeof window !== 'undefined') {
    window.env = {
      REACT_APP_ENVIRONMENT: 'prod',
      REACT_APP_URL: 'https://intocps.org/',
      REACT_APP_URL_BASENAME: '',
      REACT_APP_URL_DTLINK: '/lab',
      REACT_APP_URL_LIBLINK: '',
      REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
      REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

      REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
      REACT_APP_AUTH_AUTHORITY: 'https://gitlab.intocps.org/',
      REACT_APP_REDIRECT_URI: 'https://intocps.org/Library',
      REACT_APP_LOGOUT_REDIRECT_URI: 'https://intocps.org/',
      REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    };
  };


  // Example values with "bar" as basename URL.
  //Trailing and ending slashes are optional.
  if (typeof window !== 'undefined') {
    window.env = {
      REACT_APP_ENVIRONMENT: "dev",
      REACT_APP_URL: 'http://localhost:4000/',
      REACT_APP_URL_BASENAME: 'bar',
      REACT_APP_URL_DTLINK: '/lab',
      REACT_APP_URL_LIBLINK: '',
      REACT_APP_WORKBENCHLINK_LIBRARY_PREVIEW: '/preview/library',
      REACT_APP_WORKBENCHLINK_DT_PREVIEW: '/preview/digitaltwins',

      REACT_APP_CLIENT_ID: '1be55736756190b3ace4c2c4fb19bde386d1dcc748d20b47ea8cfb5935b8446c',
      REACT_APP_AUTH_AUTHORITY: 'https://gitlab.intocps.org/',
      REACT_APP_REDIRECT_URI: 'http://localhost:4000/bar/Library',
      REACT_APP_LOGOUT_REDIRECT_URI: 'http://localhost:4000/bar',
      REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
    };
  };
  ```

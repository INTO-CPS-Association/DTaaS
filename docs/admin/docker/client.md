# Client Environment Setup

The DTaaS Client website requires certain environment variables to be hosted.
These are set in a _.js_ file. You can find and use such files given in
_<DTaaS>/deploy/config/client_ directory.

See the definitions and examples below:

```js
if (typeof window !== 'undefined') {
window.env = {
    REACT_APP_ENVIRONMENT: "prod | dev",
    REACT_APP_URL: "URL for the gateway",
    REACT_APP_URL_BASENAME: "Base URL for the client website"(optional),
    REACT_APP_URL_DTLINK: "Endpoint for the Digital Twin",
    REACT_APP_URL_LIBLINK: "Endpoint for the Library Assets",
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: "Endpoint for the VNC Desktop link",
    REACT_APP_WORKBENCHLINK_VSCODE: "Endpoint for the VS Code link",
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: "Endpoint for the Jupyter Lab link",
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK:
    "Endpoint for the Jupyter Notebook link",
    REACT_APP_CLIENT_ID: 'AppID genereated by the gitlab OAuth provider',
    REACT_APP_AUTH_AUTHORITY: 'URL of the private gitlab instance',
    REACT_APP_REDIRECT_URI: 'URL of the homepage for the logged in users of the website',
    REACT_APP_LOGOUT_REDIRECT_URI: 'URL of the homepage for the anonymous users of the website',
    REACT_APP_GITLAB_SCOPES: 'OAuth scopes. These should match with the scopes set in gitlab OAuth provider',
};
};

// Example values with no base URL. Trailing and ending slashes are optional.
if (typeof window !== 'undefined') {
window.env = {
    REACT_APP_ENVIRONMENT: 'prod',
    REACT_APP_URL: 'https://foo.com/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
    REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
    REACT_APP_REDIRECT_URI: 'https://foo.com/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'https://foo.com/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
};


// Example values with "bar" as basename URL.
//Trailing and ending slashes are optional.
if (typeof window !== 'undefined') {
window.env = {
    REACT_APP_ENVIRONMENT: "dev",
    REACT_APP_URL: 'https://foo.com/',
    REACT_APP_URL_BASENAME: 'bar',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
    REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.foo.com/',
    REACT_APP_REDIRECT_URI: 'https://foo.com/bar/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'https://foo.com/bar',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
};
};
```
Setup the variables in an appropriate _.js_ file, and note down the path of
this file. This path needs to be set in the _<DTaaS>/docker/.env_ file.
For a _localhost_ setup, you can directly use the sample
_<DTaaS>/deploy/config/client/env.local.js_ to test your setup. However,
we recommend eventually creating a Gitlab client application, and
setting the *REACT_APP_CLIENT_ID* to the ID of this application. 
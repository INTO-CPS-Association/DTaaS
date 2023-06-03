# Host the DTaaS Client Website

To host DTaaS client website on your server, follow these steps:

- The `build` folder contains all the optimized static files that are ready for deployment.

- Locate the file `build/env.js` and replace the example values to match your infrastructure. The constructed links will be "`REACT_APP_URL`/`REACT_APP_URL_BASENAME`/`{username}`/`{Endpoint}`". See the definitions below:

```js
  window.env = {
    REACT_APP_ENVIRONMENT: "prod | dev",
    REACT_APP_URL: "URL for the gateway",
    REACT_APP_URL_BASENAME: "Base URL for the client website"(optional),
    REACT_APP_URL_DTLINK: "Endpoint for the Digital Twin",
    REACT_APP_URL_LIBLINK: "Endpoint for the Library Assets",
    REACT_APP_WORKBENCHLINK_TERMINAL: "Endpoint for the terminal link",
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: "Endpoint for the VNC Desktop link",
    REACT_APP_WORKBENCHLINK_VSCODE: "Endpoint for the VS Code link",
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: "Endpoint for the Jupyter Lab link",
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK:
      "Endpoint for the Jupyter Notebook link",
    REACT_APP_CLIENT_ID: "Client's GitLab Application Client ID", 
    REACT_APP_AUTH_AUTHORITY: "Client's GitLab URL",
    REACT_APP_REDIRECT_URI: "URI GitLab will redirect to upon successful sign in",
    REACT_APP_LOGOUT_REDIRECT_URI: "Client website's logout redirect URI",
    REACT_APP_GITLAB_SCOPES: "GitLab application scopes",
};
  };

  // Example values with no base URL. Trailing and ending slashes are optional.
  window.env = {
    REACT_APP_ENVIRONMENT: 'dev',
    REACT_APP_URL: 'https://example.com/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_TERMINAL: '/terminals/main',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
    REACT_APP_CLIENT_ID: '934b98f03f1b6f743832b2840bf7cccaed93c3bfe579093dd0942a433691ccc0',
    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.example.com/',
    REACT_APP_REDIRECT_URI: 'https://example.com/Library',
    REACT_APP_LOGOUT_REDIRECT_URI: 'https://example.com/',
    REACT_APP_GITLAB_SCOPES: 'openid profile read_user read_repository api',
  };
  ```

- Copy the entire contents of the build folder to the root directory of your server where you want to deploy the app. You can use FTP, SFTP, or any other file transfer protocol to transfer the files.

- Make sure your server is configured to serve static files. This can vary depending on the server technology you are using, but typically you will need to configure your server to serve files from a specific directory.

- Once the files are on your server, you should be able to access your app by visiting your server's IP address or domain name in a web browser.

---
### GitLab OAuth Integration

To integrate GitLab OAuth for DTaaS, you will need to create an OAuth application in GitLab and retrieve the application's client ID.

To create an application in GitLab follow these steps:

1. Sign in to GitLab.

2. Go to your User Settings by clicking on the user avatar in the upper-right corner and selecting "Settings".

3. In the sidebar, navigate to "Applications".

4. Click on "New Application".

5. Fill in the required details: 
    - Name: Give your application a name. This is the name users will see during the authorization process.

    - Redirect URI: Enter the URI users will be redirected to after they authorize with GitLab.

    - Scopes: Specify the rights for the application you're creating. For DTaaS, you'd typically need the following scopes: `openid, profile, read_user, read_repository, api.`

Click "Save Application".

In the env.js file:

- Set `REACT_APP_CLIENT_ID` to the Client ID of your OAuth application in GitLab.
- Set `REACT_APP_AUTH_AUTHORITY` to your GitLab's URL.
- Set `REACT_APP_REDIRECT_URI` and `REACT_APP_LOGOUT_REDIRECT_URI` to your chosen redirect URIs.
- Set `REACT_APP_GITLAB_SCOPES` to the scopes you require for your application. For DTaaS, you'd typically need the following scopes: `openid, profile, read_user, read_repository, api.`

#### Ensure the following:

- `REACT_APP_REDIRECT_URI` is identical to your GitLab application's `Callback URL`.
- `REACT_APP_GITLAB_SCOPES` is identical to your GitLab application's `Scopes`.

- Be aware that _redirect uri_ might be case sensitive.

For step-by-step instructions on how to create an OAuth application on GitLab and configure scopes, please refer to the official GitLab documentation: - [Configure GitLab](https://docs.gitlab.com/ee/integration/oauth_provider.html)

---

### Additional information

- [Redirect URI](https://www.oauth.com/oauth2-servers/redirect-uris/)
- [GitLab application scopes](https://docs.gitlab.com/ee/integration/oauth_provider.html#view-all-authorized-applications)



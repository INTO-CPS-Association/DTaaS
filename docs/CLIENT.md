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
  };
```

- Copy the entire contents of the build folder to the root directory of your server where you want to deploy the app. You can use FTP, SFTP, or any other file transfer protocol to transfer the files.

- Make sure your server is configured to serve static files. This can vary depending on the server technology you are using, but typically you will need to configure your server to serve files from a specific directory.

- Once the files are on your server, you should be able to access your app by visiting your server's IP address or domain name in a web browser.

---

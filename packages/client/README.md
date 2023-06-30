# Host the DTaaS Client Website

To host DTaaS client website on your server, follow these steps:

- The `site` folder contains all the optimized static files that are ready for deployment.
- Locate the file `site/env.js` to replace the `https://foo.com` in `REACT_APP_URL: 'https://foo.com/'` with your webserver URL.
- Copy the entire contents of the `site` folder to the correct directory of your server where you want to deploy the app. You can use FTP, SFTP, or any other file transfer protocol to transfer the files.
- Make sure your server is configured to serve static files. This can vary depending on the server technology you are using, but typically you will need to configure your server to serve files from a specific directory.
- Once the files are on your server, you should be able to access your app by visiting your server's IP address or domain name in a web browser.

## Complementary Components

The website requires background services for providing actual functionality. The minimum background service required is atleast one [ML Workspace](https://github.com/ml-tooling/ml-workspace) serving the following routes.

```js
https:foo.com/<username>/lab
https:foo.com/<username>/terminals/main'
https:foo.com/<username>/tools/vnc/?password=vncpassword
https:foo.com/<username>/tools/vscode/
```

The `username` is the user workspace created using ML Workspace docker container. Please follow the instructions in [README](https://github.com/ml-tooling/ml-workspace/blob/main/README.md). You can create as many user workspaces as you want. If you have two users - alice and bob - on your system, then the following the commands in  will instantiate the required user workspaces.

```bash
mkdir -p files/alice files/bob files/common

printf "\n\n start the user workspaces"
docker run -d \
 -p 8090:8080 \
  --name "ml-workspace-alice" \
  -v "$(pwd)/files/alice:/workspace" \
  -v "$(pwd)/files/common:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="alice" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2



docker run -d \
 -p 8091:8080 \
  --name "ml-workspace-bob" \
  -v "$(pwd)/files/bob:/workspace" \
  -v "$(pwd)/files/common:/workspace/common" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="bob" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2
```

Given that multiple services are running at different routes, a reverse proxy is needed to map the background services to external routes. You can use Apache, NGINX, Traefik or any other software to work as reverse proxy.

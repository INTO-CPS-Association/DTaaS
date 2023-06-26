# DTaaS on Linux Operating System

This directory contains code for running DTaaS application on a Ubuntu Server Operating System. The setup requires a machine which can spare 16GB RAM, 8 vCPUs and 50GB Hard Disk space.

A dummy **foo.com** URL has been used for illustration. Please change this to your unique website URL. It is assumed that you are going to serve the application in only HTTPS mode.

Please follow these steps to make this work in your local environment.

## Configuration

You need to configure the gateway and react client website.

### The traefik gateway server

You can run the Run the Traefik gateway server in both and HTTPS HTTPS mode to experience the DTaaS application. The installation guide assumes that you can run the application in HTTPS mode.

The Traefik gateway configuration is at [fileConfig](../config/gateway/dynamic/fileConfig.yml). Change `localhost` to `https://foo.com`. 

#### Authentication

The dummy username is `foo` and the password is `bar`.
Please change this before starting the gateway.

```bash
rm auth
htpasswd -c deploy/config/gateway/auth <username>
password: <your password>
```

## Configure react website

Change the React website configuration in _deploy/config/client/env.js_.

```js
window.env = {
    REACT_APP_ENVIRONMENT: 'prod',
    REACT_APP_URL: 'https://foo.com/',
    REACT_APP_URL_BASENAME: '',
    REACT_APP_URL_DTLINK: '/lab',
    REACT_APP_URL_LIBLINK: '',
    REACT_APP_WORKBENCHLINK_TERMINAL: '/terminals/main',
    REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
    REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
    REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
    REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
};
```

## Perform the Installation

Go to the DTaaS directory and execute

```sh
source script/docker.sh 
# make sure that all the docker containers are pulled completely before running the next command
source deploy/install.sh
```


## Create daemon jobs

The **client website** and **lib microservice** need to run in the daemon mode. In case these services shutdown for any reason, they need to be brought back up. To do so, crontab need to be created. You can do so, by executing the following command from the directory where the project has been placed.

```bash
source deploy/create-crontab.sh "$(pwd)"
```

## Access the application

Now you should be able to access the DTaaS application at: _https://foo.com_


# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software. This software shall be used for providing a React single page web application for the Digital Twin support platform.

## Setup the Environment and Build

The following steps are required to setup the environment and build the application.

### Prerequisites

If you are using yarn 2, please change the package.json to use `postinstall` instead `prepare` scripts.

```bash
cd client
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn build      #build the react app into build/ directory

#specify the environment; specify only one
yarn configapp #prod | dev

yarn start      #start the application
yarn test       #UI testing of the application
yarn clean      #clean the directory of temporary files
```

---

## Custom configuration

It is required to have a `env.js` in the root directory of `build` during runtime. This file is used to configure the endpoints of the application. See the [build instructions](../docs/CLIENT.md) for an example.

### Multiple configurations

If you want to switch between multiple environments, you can use the `yarn configapp` command to copy a configuration file from `client/config/` to the `build` directory.

1. Save the file as `client/config/<config-name>.js`.
2. Run the config command to copy the file to the `public` directory and the `build` directory, if a build is present.

```bash
yarn configapp <config-name>
```

> Which ever env.js file is present in the `public` directory during `yarn build`, will be used in the build.

It is therefore reccommend to keep the configurations in the `client/config/` directory and use the `yarn configapp` command to switch between them.

---

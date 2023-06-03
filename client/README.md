# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software. This software shall be used for providing a React single page web application for the Digital Twin support platform.

## Setup the Environment and Build

The following steps are required to setup the environment and build the application.

### Prerequisites

```bash
cd client
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn build      #build the react app into build/ directory
yarn develop    #start the development server without building. Great for live edits.


#Required: Specify the environment; specify only one
yarn configapp #prod | dev #If not specified, the app wont run.

yarn start      #start the application
yarn test       #UI testing of the application
yarn clean      #clean the directory of temporary files
```
It is also possible to run different types of tests using the yarn test command by passing different flags:
```bash
yarn test -a:   #run all tests
yarn test -u:   #run unit tests
yarn test -e:   #run end-to-end tests
```
---

## Custom configuration

It is required to have a `env.js` in the root directory of `build` during runtime. This file is used to configure the endpoints of the application. See the [build instructions](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/docs/user/client/CLIENT.md) for an example.

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

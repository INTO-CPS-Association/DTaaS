# Motivation

Website for Digital Twin as a Service (DTaaS) software.

This is a mono repo containing code for both the client (web browser) and server code.

## Helpful Commands

### Install the Environment

```bash
bash script/install.bash
```

### for Client app

```bash
cd client
yarn install    #install the nodejs dependencies
yarn syntax     #perform linting and static analysis
yarn build      #build the react app into build/ directory

#one of the environments; specify only one; "dev" used the REACT_APP_ENV is not set
export REACT_APP_ENV= "dev | test | prod"   
yarn configapp

yarn start      #start the application
yarn test       #do 'yarn start' in another terminal before testing the application
yarn clean      #clean the directory of temporary files
```

### for server app

The server apps shall be a set of microservices.

```bash
cd server/<microservice-folder>
yarn install    #install the nodejs dependencies
yarn syntax     #perform linting and static analysis
yarn build      #compile ES6 files into ES5 javascript files and copy all JS files into build/ directory
yarn test       #test the application

#optional step: set the environment variables in .env file

yarn start      #start the application
yarn clean      #clean the directory of temporary files
```

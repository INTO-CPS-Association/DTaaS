# Motivation

Website for Digital Twin as a Service (DTaaS) software.

This is a mono repo containing code for both the client (web browser) and server code.

## Install the Environment

```bash
bash script/install.bash
```

---

## For Client app (serves React Website)

```bash
cd client
yarn install    #install the nodejs dependencies
yarn syntax     #perform linting and static analysis
yarn build      #build the react app into build/ directory

#one of the environments; specify only one; "dev" used the REACT_APP_ENV is not set
export REACT_APP_ENV= "dev | test | prod"   
yarn configapp

yarn start      #start the application
yarn test       #UI testing of the application
yarn clean      #clean the directory of temporary files
```

---

## Infrastructure Components

The application requires the following open-source components.

1. Traefik
1. InfluxDB
1. Grafana

See each of the directories to launch the respective docker services.

**TODO**: docker-compose file for all the infrastructure components.

---

## For server apps

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

# Motivation

Website for Digital Twin as a Service (DTaaS) software. This software shall be used for creating a Digital Twin support platform for SMEs. A brief overview of the software is available in [this presentation](docs/DTaaS-overview.pdf) and [recorded video](https://www.dropbox.com/s/mgxxf5chp9b130x/DTaaS%20presentation%20and%20brainstorming-20230317.mp4?dl=1).

This is a mono repo containing code for both the client (web browser) and server code.

## Install the Environment

```bash
bash script/install.bash
```

---

## For Client app (serves React Website)

See these [instructions](client/README.md)

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

## License

This software is owned by [The INTO-CPS Association](https://into-cps.org/) and is licensed under the terms of the INTO-CPS Association.
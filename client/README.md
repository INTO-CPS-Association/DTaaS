# Introduction

Client (frontend) for Digital Twin as a Service (DTaaS) software. This software shall be used for providing a single page web application for the Digital Twin support platform.

---

## Setup the Environment and Build

```bash
cd client
yarn install    #install the nodejs dependencies
yarn syntax     #perform linting and static analysis
yarn build      #build the react app into build/ directory

#specify the environment; specify only one
yarn configapp #prod | dev

yarn start      #start the application
yarn test       #UI testing of the application
yarn clean      #clean the directory of temporary files
```

---

## Configuration

To customize the configuration of endpoints to your preference, it is recommended that you configure the environment file of your choice located in the `'./config'` directory.

Once the configuration file has been updated, please rerun the configuration bash to apply the changes.

```bash
yarn configapp #prod | dev
```

---

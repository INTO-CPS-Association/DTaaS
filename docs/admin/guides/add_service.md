# Add other services

<!-- prettier-ignore -->
!!! Pre-requisite
    You should read the documentation about
    the already available [services](../services.md)

This guide will show you how to add more services.
In the following example we will be adding **MongoDB** as a service,
but these steps could be modified to install other services as well.

:fontawesome-solid-circle-info:
**Adding other services requires more RAM and CPU power.**
**Please make sure the host machine meets the hardware requirements**
**for running all the services.**

**1. Add the configuration:**

Select configuration parameters for the MongoDB service.

| Configuration Variable Name | Description                                                       |
| :-------------------------- | :---------------------------------------------------------------- |
| username                    | the username of the root user in the MongoDB                      |
| password                    | the password of the root user in the MongoDB                      |
| port                        | the mapped port on the host machine (default is 27017)            |
| datapath                    | path on host machine to mount the data from the MongoDB container |

Open the file `/deploy/services/services.yml` and add the configuration for MongoDB:

```yml
services:
    rabbitmq:
        username: "dtaas"
        password: "dtaas"
        vhost: "/"
        ports:
            main: 5672
            management: 15672
    ...
    mongodb:
        username: <username>
        password: <password>
        port: <port>
        datapath: <datapath>
    ...
```

**2. Add the script:**

The next step is to add the script that sets up the MongoDB container with the configuraiton.

Create new file named `/deploy/services/mongodb.js` and add the following code:

```js
#!/usr/bin/node
/* Install the optional platform services for DTaaS */
import { $ } from "execa";
import chalk from "chalk";
import fs from "fs";
import yaml from "js-yaml";

const $$ = $({ stdio: "inherit" });
const log = console.log;
let config;

try {
  log(chalk.blue("Load services configuration"));
  config = await yaml.load(fs.readFileSync("services.yml", "utf8"));
  log(
    chalk.green(
      "configuration loading is successful and config is a valid yaml file"
    )
  );
} catch (e) {
  log(chalk.red("configuration is invalid. Please rectify services.yml file"));
  process.exit(1);
}

log(chalk.blue("Start MongoDB server"));
const mongodbConfig = config.services.mongodb;

try {
  log(
    chalk.green(
      "Attempt to delete any existing MongoDB server docker container"
    )
  );
  await $$`docker stop mongodb`;
  await $$`docker rm mongodb`;
} catch (e) {}

log(chalk.green("Start new Mongodb server docker container"));
await $$`docker run -d -p ${mongodbConfig.port}:27017 \
--name mongodb \
-v ${mongodbConfig.datapath}:/data/db \
-e MONGO_INITDB_ROOT_USERNAME=${mongodbConfig.username} \
-e MONGO_INITDB_ROOT_PASSWORD=${mongodbConfig.password} \
mongo`;
log(chalk.green("MongoDB server docker container started successfully"));
```

**3. Run the script:**

Go to the directory `/deploy/services/`
and run services script with the following commands:

```bash
yarn install
node mongodb.js
```

The MongoDB should now be available on **services.foo.com:<port\>**.

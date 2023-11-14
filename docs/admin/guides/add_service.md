# Add other services

**- [ ] Can the services.js only be run on vagrant two-machines??**

!!! Pre-requisite
    You should have read the documentation about the already available [services](../services.md)
    <!-- You should be running the DTaaS with the [vagrant-two-machines](../vagrant/two-machines.md7) configuration.  -->


Then is guide will show you how to add more services. In the following example we will be adding __mongodb__ as a service, but this could be used for other services as well.


## 1. Add the configuration
You should add the following configuration variables.

| Configuration Variable Name | Description                                                       | 
| :-------------------------- | :-----------------------------------------------------------------|
| username                    | the username of the root user in the mongodb                      |
| password                    | the password of the root user in the mongodb                      |
| port                        | the mapped port on the host machine (default is 27017)            |
| datapath                    | path on host machine to mount the data from the mongodb container |

Open the file `/deploy/services.yml` and add the configuration for mongodb:

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

## 2. Update the script

The next step is to make the script use the mongodb configuration and set up the container.

Add the following code to `/deploy/services/services.js`.

```js
log(chalk.blue("Start MongoDB server"));
const mongodbConfig = config.services.mongodb;

try {
  log(chalk.green("Attempt to delete any existing MongoDB server docker container"));
  await $$`docker stop mongodb`;
  await $$`docker rm mongodb`;  
} catch (e) {
}

log(chalk.green("Start new Mongodb server docker container"));
await $$`docker run -d -p ${mongodbConfig.port}:27017 \
--name mongodb \
-v ${mongodbConfig.datapath}:/data/db \
-e MONGO_INITDB_ROOT_USERNAME=${mongodbConfig.username} \
-e MONGO_INITDB_ROOT_PASSWORD=${mongodbConfig.password} \
mongo`;
log(chalk.green("MongoDB server docker container started successfully"));
```

## 3. Run the script

Go to the directory `/deploy/services/` and run services script with the following commands:

```bash
yarn install
node services.js
```

The MongoDB should now be available on **services.foo.com:<port\>**.

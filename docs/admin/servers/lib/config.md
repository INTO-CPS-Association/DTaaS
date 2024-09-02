# :gear: Configure Library Microservice

The microservices requires config specified in INI format.
The template configuration file is:

```ini
PORT='4001'
MODE='local'
LOCAL_PATH='/Users/<Username>/DTaaS/files'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'
```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

Replace the default values the appropriate values for your setup.

The config is saved `.env` file by convention. The **libms** looks for
`.env` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run

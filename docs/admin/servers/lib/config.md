# :gear: Configure Library Microservice

The microservices requires config specified in INI format.
The template configuration file is:

```ini
PORT='4001'
MODE='local' or 'git'
LOCAL_PATH='/Users/<Username>/DTaaS/files'
LOG_LEVEL='debug'
APOLLO_PATH='/lib' or ''
GRAPHQL_PLAYGROUND='false' or 'true'

#Only needed if git mode
GIT_USER1_REPO_URL='<git repo url>'
GIT_USER1_API_TOKEN='<TOKEN>'
...
GIT_USERX_REPO_URL='<git repo url>'
GIT_USERX_API_TOKEN='<TOKEN>'

```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

The `MODE` variable sets the mode for which and how the files should be served. If `git` mode is chosen, the following is required.

| Variable | Description |
|----------|-------------|
| `GIT_USER1_REPO_URL` | URL of the git repository for user 1 |
| `GIT_USER1_API_TOKEN` | API token for accessing the git repository for user 1 (if not public) |

Replace the default values the appropriate values for your setup.

The config is saved `.env` file by convention. The **libms** looks for
`.env` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run

# :gear: Configure Library Microservice

The microservices requires config specified in yaml format.
The template configuration file is:

```yaml

port: '4001'
mode: 'local' or 'git'
local-path: '/Users/<Username>/DTaaS/files'
log-level: 'debug'
apollo-path: '/lib' or ''
graphql-playground: 'false' or 'true'

#Only needed if git mode
git-repos:
  - <username>:
      repo-url: '<git repo url>'
  ...
  - <username>:
      repo-url: '<git repo url>'

```

The `LOCAL_PATH` variable is the absolute filepath to the
location of the local directory which will be served to users
by the Library microservice.

The `MODE` variable sets the mode for which and how the files should be served. If `git` mode is chosen, the following is required.

| Variable       | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| `username`     | Username in which folder the repos will be cloned.                                     |
| `git repo url` | HTTP URL of the git repository to clone. Optional to add `.git` to the end of the URL. |

Replace the default values the appropriate values for your setup.

The **libms** looks for
`libms.yaml` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run with `-c <path-to-file>`.

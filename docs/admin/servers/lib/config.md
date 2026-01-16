# :gear: Configure Library Microservice

The microservice requires configuration specified in YAML format.
The template configuration file is:

```yaml
port: '4001'
mode: 'local' or 'git'
local-path: '/home/Desktop/files'
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

The `local-path` variable is the relative filepath to the
location of the local directory which will be served to users
by the Library microservice.

The default values should be replaced with appropriate values for the deployment.
This configuration should be saved as a YAML file, for example as `libms.yaml`.

## Operation Modes

The mode indicates the backend storage for the files.
There are two possible modes - `local` and `git`.
The files available in the `local-path` are served to users in `local` mode.
In the `git` mode, the remote git repos are cloned and they are
served to users as local files.

### git mode

A fragment of the config for `git` mode is:

```yaml
...
git-repos:
  - user1:
      repo-url: 'https://gitlab.com/dtaas/user1.git'
  - user2:
      repo-url: 'https://gitlab.com/dtaas/user2.git'
  - common:
      repo-url: 'https://gitlab.com/dtaas/common.git'
```

Here, `user1`, `user2` and `common` are the local directories into which
the remote git repositories get cloned. The name of the repository need not
match with the local directory name. For example, the above configuration
enables library microservice to clone
`https://gitlab.com/dtaas/user1.git` repository into
`user1` directory. Any git server accessible over
HTTP(S) protocol is supported.
The `.git` suffix is optional.

The default values should be replaced with appropriate values for the deployment.

The **libms** looks for
`libms.yaml` file in the working directory from which it is run.
If you want to run **libms** without explicitly specifying the configuration
file, run with `-c <path-to-file>`.

Further documentation on the use of library microservice is available
on [this page](npm.md).

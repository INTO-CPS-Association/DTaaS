# :gear: Configure Library Microservice

The microservice reads its configuration from a YAML file.
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

The `local-path` variable is the path to the local directory that the
library microservice serves to users.

With `graphql-playground: 'true'`, a browser that opens `apollo-path`
gets GraphiQL, a web page for writing and running GraphQL queries.
With `'false'`, the microservice serves no such page and accepts only
the GraphQL queries themselves.

Replace the default values with values suited to the deployment and
save the configuration as a YAML file, for example `libms.yaml`.

## Operation Modes

The mode sets the backend storage for the files. There are two modes,
`local` and `git`. In `local` mode, users get the files in
`local-path`. In `git` mode, the remote git repositories are cloned
and served to users as local files.

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
the remote git repositories are cloned. The repository name need not
match the local directory name. For example, the above configuration
makes the library microservice clone the
`https://gitlab.com/dtaas/user1.git` repository into the
`user1` directory. Any git server reachable over HTTP(S) is supported.
The `.git` suffix is optional.

Replace the default values with values suited to the deployment.

By default, **libms** looks for a `libms.yaml` file in the working
directory from which it is run. To use a configuration file at another
location, pass `-c <path-to-file>`.

The [npm package page](npm.md) has more on using the library
microservice.

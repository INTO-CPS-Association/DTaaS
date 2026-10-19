# Independent Packages

The DTaaS development team publishes reusable packages that together
form the complete DTaaS application.

The packages are published on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS),
[npmjs](https://www.npmjs.com/org/into-cps-association), and
[docker hub](https://hub.docker.com/u/intocps) repositories.

The packages on
[github](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
are published more frequently but are not user tested.
The packages on [npmjs](https://www.npmjs.com/org/into-cps-association)
and [docker hub](https://hub.docker.com/u/intocps)
are published at least once per release.
Regular users should use the packages from npmjs and docker hub.

The packages are:

<!-- markdownlint-disable MD060 -->

| Package Name | Description                                    | Documentation for                                                                                                       | Availability                                                                                                                                          |
| :----------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| dtaas-web    | React web application                          | Useful only for DevOps features. The workspace features are not available in the standalone package.                    | [docker hub](https://hub.docker.com/r/intocps/dtaas-web) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/dtaas-web)         |
| libms        | Library microservice                           | [npm package](servers/lib/npm.md)                                                                                       | [npmjs](https://www.npmjs.com/package/@into-cps-association/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/libms)         |
|              |                                                | [container image](servers/lib/docker.md)                                                                                | [docker hub](https://hub.docker.com/r/intocps/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/libms)                 |
| logger-ms    | Workflow logger microservice                   | [npm package](servers/logger/npm.md)                                                                                    | [npmjs](https://www.npmjs.com/package/@into-cps-association/logger-ms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/logger-ms) |
|              |                                                | [container image](servers/logger/docker.md)                                                                             | [docker hub](https://hub.docker.com/r/intocps/logger-ms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/logger-ms)         |
| runner       | REST API wrapper for multiple scripts/programs | [npm package](../user/servers/execution/runner/readme.md)                                                               | [npmjs](https://www.npmjs.com/package/@into-cps-association/runner) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/runner)       |
| workspace    | User workspace container image                 | [workspace localhost](workspace/localhost/install.md) and [workspace secure server](workspace/secure-server/install.md) | [docker hub](https://hub.docker.com/r/intocps/workspace) and `intocps/workspace:*` images referenced by deployment packages                           |

<!-- markdownlint-enable MD060 -->

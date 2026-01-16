# Independent Packages

The DTaaS development team publishes reusable packages which are then
put together to form the complete DTaaS application.

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
The regular users are encouraged to use the packages from npm and docker hub.

A brief explanation of the packages is given below.

| Package Name                                                                              | Description                                    | Documentation for                                                                                    | Availability                                                                                                                                                          |
| :---------------------------------------------------------------------------------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dtaas-web                                                                                 | React web application                          | Useful only for DevOps features. The workspace features will not be available in standalone package. | [docker hub](https://hub.docker.com/r/intocps/dtaas-web) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/dtaas-web)                         |
| libms                                                                                     | Library microservice                           | [npm package](servers/lib/npm.md)                                                                    | [npmjs](https://www.npmjs.com/package/@into-cps-association/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/libms)                         |
|                                                                                           |                                                | [container image](servers/lib/docker.md)                                                             | [docker hub](https://hub.docker.com/r/intocps/libms) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/container/libms)                                 |
| runner                                                                                    | REST API wrapper for multiple scripts/programs | [npm package](../user/servers/execution/runner/readme.md)                                            | [npmjs](https://www.npmjs.com/package/@into-cps-association/runner) and [github](https://github.com/INTO-CPS-Association/DTaaS/pkgs/npm/runner)                       |
| ml-workspace-minimal (fork of [ml-workspace](https://github.com/ml-tooling/ml-workspace)) | User workspace                                 | not available                                                                                        | [docker hub](https://hub.docker.com/r/intocps/ml-workspace-minimal/tags). Please note that this package is **highly experimental** and only v0.15.0-b2 is usable now. |

# Developer Diagrams

Diagrams of the DTaaS codebase for developers, drawn with the
diagram-design skill in the colours of the website theme. Each diagram
has a light and a dark HTML source (`<name>.html`, `<name>-dark.html`),
SVG exports of both, PNG images of both at 1600 pixels wide, and an
editable `<name>.drawio` file. The two feature timelines have no drawio
file, and their PNG images come from the SVG exports. Text uses the
skill's presentation sizes (16 pixel names, 12 pixel labels) on canvases
about 1040 pixels wide, so it stays legible in the documentation column.
`PROMPTS.md` keeps the prompts and decisions that produced these
diagrams.

| Diagram | About |
| :--- | :--- |
| `platform-architecture` | The runtime architecture of the whole platform: the browser client reaches the library, logger and user workspaces through the Traefik gateway, and drives digital twin execution directly against GitLab. Two admin CLIs sit beside it, one provisioning users and workspaces and the other the platform services. |
| `cli-architecture` | The internal structure of the `dtaas` admin CLI in `cli/`, from the Click commands through the config, deployment, user and platform modules. It shows how vendored templates become a deployment directory, how Docker Compose is driven, and where GitLab accounts are provisioned. |
| `client-architecture` | The internal structure of the React web client: pages guarded by the OIDC auth provider, state in Redux, and DT lifecycle logic in the `dt-automation` package. It shows the external systems the browser talks to: GitLab pipelines, workspace iframes and the logger beacon. |
| `runner-architecture` | The request path through the runner microservice in `servers/execution/runner`, from the validation pipe and controller to `ExecaManager` and `RunnerFactory`. It shows the `runner.yaml` allowlist, the in-memory queue and how scripts run through execa. |
| `services-architecture` | The platform services package in `deploy/services`: the `dtaas-services` CLI, its project directory and the three compose groups it manages. It highlights that ThingsBoard must start after PostgreSQL and that the GitLab runner is registered by hand. |
| `technology-stack` | The technology stack of the two CLIs, the web client, the deployment packages and the microservices, from runtime and framework up through libraries, test tooling and delivery. Each cell names the technologies and their declared versions, and two notes record the optional service installs and the version pins that differ between packages. |
| `dtaas-localhost-deployment` | The `deploy/dtaas/docker/localhost` package on one Docker host, with Traefik on port 80, no forward-auth and no TLS. It places the web client, logger and a single workspace on the default network, with sign-in against gitlab.com. |
| `dtaas-server-deployment` | The `deploy/dtaas/docker/server` package, where Traefik serves plain HTTP and forward-auth uses an insecure cookie. It shows the frontend and users networks, two workspaces, and that port 443 is published without a Traefik entrypoint. |
| `dtaas-secure-server-deployment` | The `deploy/dtaas/docker/secure-server` package, where Traefik terminates TLS on port 443 and forward-auth checks every request against GitLab. It shows the frontend and users networks, the image versions and the host bind mounts. |
| `dtaas-secure-server-gitlab-deployment` | The `deploy/dtaas/docker/secure-server_with_integrated-gitlab` package, which adds a GitLab CE container routed at `/gitlab`. Forward-auth reaches that container directly for OAuth2, so no external GitLab is needed. |
| `workspace-dex-localhost-deployment` | The `deploy/workspace/dex/localhost` package, where Dex is published on port 5556 as the OIDC provider of the web client. Traefik routes to the client and one workspace without forward-auth, so the workspace route is unprotected. |
| `workspace-keycloak-deployment` | The `deploy/workspace/keycloak/production` package, where Traefik terminates TLS and routes `/auth` to Keycloak. Forward-auth uses Keycloak as its OIDC issuer to guard the web client and two workspaces, and Keycloak keeps its realm in a named volume. |
| `dtaas-cli-admin-onboarding` | The steps an administrator follows to stand up DTaaS with the `dtaas` CLI, from writing `dtaas.toml` to installing the platform. It branches on localhost installs, where `user add` is not supported, and on optional GitLab account provisioning. |
| `dtaas-services-admin-onboarding` | The steps an administrator follows to stand up the platform services with `dtaas-services`, from project generation to user accounts. It marks the two steps that need root and the optional ThingsBoard and GitLab installs. |
| `client-user-onboarding` | The first steps of a new user in the web client, from the gateway login and app sign-in to landing on the Library. It branches into authoring in Digital Twins, automating twins, or opening workspace tools from the Workbench. |
| `client-contributor-onboarding` | The path a new contributor follows in `client/`, from opening the repository to a pull request. It highlights the package test scripts that must be used instead of bare `jest`, and adds end-to-end tests when GitLab flows change. |
| `dtaas-cli-contributor-onboarding` | The path a new contributor follows in `cli/`, from installing with Poetry to a pull request. It highlights the vendoring step that must run before the tests, and the need to repeat it after shared code changes. |
| `dtaas-services-contributor-onboarding` | The path a new contributor follows in `deploy/services/cli`, from installing with Poetry to a pull request. It highlights the vendoring step and the `CI=true` unit test command, and adds the Docker system tests when Docker behaviour changes. |
| `dt-execution-state-machine` | The states of one digital twin execution record in `lib/dt-automation`, from a start with a trigger token through parent and child pipeline polling. It ends in completed, failed, canceled, timed out or error, and highlights how a stale poll overwrites a cancel with a timeout. |
| `dt-execution-data-model` | The entities of the DevOps workflow in `lib/dt-automation`, centred on `DigitalTwin` with its Redux record, GitLab backend, files and library assets. It shows execution records in IndexedDB and the job logs each record holds. |
| `measurement-state-machine` | The lifecycle of one measurement task, which runs its trials one after another and the executions of each trial in parallel. It ends in success, saved to IndexedDB, in failure, or stopped by the user or a page reload. |
| `measurement-data-model` | The entities of the measurement feature, from task definitions and settings to timed tasks, trials and execution results. It shows the pipelines tracked only while running and the measurement records saved to IndexedDB. |
| `create-use-share-workspace` | The create-use-share process in user workspaces, with the Asset Author, DT Creator, DT Manager and User as lanes and the DT Manager limited to reconfiguring twins. Assets and twins are created and used privately in each owner's workspace folders, and are shared only when copied into the common folder that every workspace sees. |
| `create-use-share-automation` | The create-use-share process in the DT automation layer, with the same four roles as lanes and the DT Manager limited to reconfiguring twins. Assets and twins are created and used privately in each owner's GitLab project, run as GitLab pipelines, and are shared only when pushed to the common GitLab project. |
| `features-timeline-all` | The features of the codebase from the first commit in August 2022 to today, placed at their release tags. It marks v1.0 and v1.1 as the milestone releases. |
| `features-timeline-last-year` | The features merged and released between October 2025 and October 2026, placed at their merge and tag dates. It shows the run from concurrent executions to the v1.1 release. |

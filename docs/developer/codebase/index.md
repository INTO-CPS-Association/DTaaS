# Codebase Overview

DTaaS is maintained as a monorepo. The repository combines user-facing
applications, deployment packages, admin tooling, backend services,
documentation, and release support scripts.

## Top-level layout

```text
DTaaS/
├── .github/               # Workflows, issue templates, agent instructions
├── cli/                   # Python admin CLI package
├── client/                # React and TypeScript frontend
├── deploy/                # Scenario-based deployment packages and services CLI
├── docker/                # Development Dockerfiles and compose templates
├── docs/                  # MkDocs source documentation
├── files/                 # Example workspace content and shared assets
├── script/                # Automation for docs, environment setup, and releases
├── servers/               # Backend services
│   ├── execution/         # Digital twin execution and runner services
│   └── lib/               # Library microservice
└── site/                  # Generated static documentation output
```

## Directory roles

| Directory | Purpose |
| :--- | :--- |
| `cli/` | Python package for administrative user and workspace operations. |
| `client/` | Main DTaaS web application with route, store, model, and test layers. |
| `servers/` | NestJS and service code for the execution and library backends. |
| `deploy/` | Installable DTaaS, workspace, runner, and platform-services packages. |
| `docker/` | Local development Dockerfiles and compose templates. |
| `docs/` | Documentation source used by `mkdocs.yml` and `mkdocs-github.yml`. |
| `script/` | Helper scripts for docs publishing, environment setup, and release tasks. |
| `.github/` | CI workflows, repository templates, copilot instructions, and specialized agent modes. |

## Codebase entry points

Use the pages in this section based on the part of the monorepo you need to
change:

- [Client](client.md) for the React frontend structure and test commands.
- [DevOps Framework](devops.md) and [Client DevOps Integration](client-devops.md)
  for GitLab-backed digital twin lifecycle flows.
- [DTaaS CLI](cli.md) for the Python admin CLI package.
- [DTaaS Services](dtaas-services.md) for the platform-services provisioning CLI.
- [Library Microservice](lib-ms.md) and [Runner Microservice](runner.md) for
  backend service implementation details.
- [Publish Packages](publish-packages.md) for package-release workflows.

## Agent and automation files

The repository also stores Copilot-specific project guidance in
`.github/copilot-instructions.md` and task-specific custom modes in
`.github/agents/*.agent.md`. These files are part of the repository-level
developer workflow and should be updated when coding guidance or agent modes
change.

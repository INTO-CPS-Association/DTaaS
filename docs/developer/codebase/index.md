# Codebase Overview

DTaaS is a monorepo. It holds the web client, the backend services,
shared libraries, deployment packages, admin tooling, documentation and
release scripts.

## Top-level layout

```text
DTaaS/
├── .agents/skills/        # Agent Skills for coding agents
├── .claude/skills/        # Claude Code stubs for the skills
├── .github/               # Workflows, issue templates, Dependabot configuration
├── cli/                   # Python admin CLI package
├── client/                # React and TypeScript frontend
├── deploy/                # Scenario-based deployment packages and services CLI
├── developer/             # Development container and Docker workflow
├── docs/                  # MkDocs source documentation
├── lib/                   # Shared libraries
│   ├── dt-automation/     # Digital twin automation npm package
│   └── gitlab_common/     # GitLab Python library for the CLIs
├── script/                # Automation for docs, environment setup, and releases
└── servers/               # Backend services
    ├── execution/runner/  # Runner microservice
    ├── lib/               # Library microservice
    ├── logger/            # Logger microservice
    └── signals/           # Signals gateway microservice
```

## Directory roles

| Directory | Purpose |
| :--- | :--- |
| `.agents/` | Agent Skills; see [Coding Agents](../contributions/coding-agents.md). |
| `cli/` | Python package for administrative user and workspace operations. |
| `client/` | Main DTaaS web application with route, store, model, and test layers. |
| `deploy/` | Installable DTaaS, workspace, runner, and platform-services packages. |
| `developer/` | The `devenv` development container and the `check` Docker workflow. |
| `docs/` | Documentation source used by `mkdocs.yml` and `mkdocs-github.yml`. |
| `lib/` | The `dt-automation` npm package and the `gitlab_common` Python library. |
| `script/` | Helper scripts for docs publishing, environment setup, and release tasks. |
| `servers/` | NestJS services: the library, runner, logger and signals gateway microservices. |
| `.github/` | CI workflows, repository templates and Dependabot configuration. |

## Codebase entry points

The pages in this section follow the parts of the monorepo:

- [Client](client.md) for the React frontend structure and test commands.
- [DevOps Framework](devops.md) and [Client DevOps Integration](client-devops.md)
  for GitLab-backed digital twin lifecycle flows.
- [DTaaS CLI](cli.md) for the Python admin CLI package.
- [DTaaS Services](dtaas-services.md) for the platform-services provisioning CLI.
- [Library Microservice](lib-ms.md), [Runner Microservice](runner.md) and
  [Signals Gateway](signals-ms.md) for backend service implementation details.
- [Publish Packages](publish-packages.md) for package-release workflows.

The logger microservice (`servers/logger/`) has no page in this section
yet. Its design notes are in `servers/logger/ARCHITECTURE.md` and
`servers/logger/DEVELOPER.md`.

## Agent and automation files

Coding agents read `AGENTS.md`, which holds the general coding
guidelines, and `PROJECT.md`, which holds the build and test commands,
verification steps, shipping cycle and pull request checks specific to
this repository. `CLAUDE.md` imports both for Claude Code.

Task-specific instructions are Agent Skills in `.agents/skills/`, with a
stub for each in `.claude/skills/` for Claude Code.
`.github/copilot-instructions.md` points GitHub Copilot to `AGENTS.md`
and `PROJECT.md`. See [Coding Agents](../contributions/coding-agents.md).

# DTaaS Multi-Container DevContainer Setup

This directory contains configurations for a multi-container development environment for the DTaaS project, allowing developers to focus on either client development or full-stack development.

## Structure

```
.devcontainer/
├── client/             # Client-specific development environment
│   ├── devcontainer.json  # Configuration for client development
│   └── Dockerfile         # Client development container setup
├── dtaas/              # Full DTaaS development environment
│   ├── devcontainer.json  # Configuration for full stack development
│   └── Dockerfile         # Full stack development container setup
└── README.md           # This file
```

## Available Environments

### 1. Client Development Environment

Focused on React/TypeScript client development with minimal dependencies. Ideal for:

- Frontend developers working exclusively on the client components
- Lower resource usage (requires less memory and CPU)
- Faster container startup times

### 2. Full DTaaS Development Environment

Complete development environment with tools for both frontend and backend development. Includes:

- All client development tools
- Documentation generation tools (MkDocs)
- Backend development utilities
- Library microservice dependencies

## How to Use

### VS Code DevContainers

1. Open the DTaaS project in VS Code
2. When prompted to "Reopen in Container", click "Reopen in Container" (uses the full DTaaS environment by default)
3. To switch environments:
   - Press F1 and run "Remote-Containers: Open Folder in Container..."
   - Select the DTaaS folder and choose either the client or dtaas configuration

# GitHub Copilot Instructions for DTaaS

## Project Overview

DTaaS (Digital Twin as a Service) is a comprehensive platform for
creating, managing, and executing digital twins. The project consists
of multiple components including a React TypeScript client,
NestJS / Python backend services, documentation, and
infrastructure configurations.

## Project Structure

```bash
DTaaS/
├── cli/               # admin CLI python pip package
├── client/            # React TypeScript frontend
├── servers/           # Backend services
│   ├── lib/           # Library management service
│   ├── execution/     # Digital twin execution service
├── docs/              # Documentation (MkDocs)
├── deploy/            # Deployment and installation configurations
└── scripts/           # Utility scripts for setting up the developer workspace
```

## Code Style and Conventions

### TypeScript/JavaScript (Client & Node.js Services)

- Use TypeScript for code in client & servers
- Follow ESLint configuration where defined
- Use Prettier for code formatting
- Prefer async/await over promises
- Use explicit return types for functions
- Follow camelCase for variables and functions, PascalCase for components
  and interfaces
- Use interfaces over types for object definitions

### React Components (Client)

- Use functional components with React hooks
- Implement proper TypeScript interfaces for props
- Use React Testing Library for component testing
- Follow the existing folder structure: `client/src/components/`,
  `client/src/page/`, `client/src/route/`

### Python (Admin CLI Package)

- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Use docstrings for all functions and classes
- Prefer f-strings for string formatting
- Use virtual environments for dependency management
- Follow camelCase naming convention

### Node.js Services (Servers)

- Use Nest.js framework patterns
- Use proper error handling with try-catch blocks
- Follow RESTful API design principles
- Use environment variables for configuration

## Directory-Specific Guidelines

### CLI (`cli/`)

- **Package Manager**: Use Poetry for dependency management and packaging
- **Structure**: Follow the package structure with `src/` for source code,
  `tests/` for tests
- **Command Framework**: Use Click for CLI command definitions and
  argument parsing
- **Configuration**: Read from `dtaas.toml` using the `Config` class in
  `src/pkg/config.py`
- **User Management**: User operations in `src/pkg/users.py` handle
  Docker Compose and file system operations
- **Error Handling**:
  - Return exceptions as values (not raising) from utility functions
  - Use Click's `ClickException` for CLI-level errors
  - Provide clear, user-friendly error messages
- **Code Style**:
  - Follow PEP 8 conventions
  - Use type hints for function parameters and return values
  - Use docstrings for all public functions and classes
  - Prefer f-strings for string formatting

### Client (`client/`)

- **Structure**: Follow React best practices with components, pages,
  routes, and utilities
- **State Management**: Use Redux Toolkit with typed slices
- **Testing**: Use Jest, React and Playwright Testing Libraries
- **Styling**: Follow existing CSS/styling patterns
- **API Integration**: Use the GitLab API integration patterns in
  `client/src/model/backend/`

### Servers (`servers/`)

- **Library Service** (`servers/lib/`): Handle library asset management
- **Execution Service** (`servers/execution/`): Manage digital twin execution

### Documentation (`docs/`)

- Use MkDocs with Material theme
- Use proper Markdown formatting
- Write clear, concise documentation
- Include code examples and diagrams
- Follow existing documentation structure
- Include API documentation for all endpoints

### Deployment (`deploy/`)

- **Docker**: Use multi-stage builds, optimize image sizes
- **Traefik**: Configure proper routing and TLS
- **Compose**: Use environment-specific configurations

### Scripts (`scripts/`)

- **Bash Scripts**: Follow best practices, include error handling
- **Powershell Scripts**: Follow best practices, include error handling
- **Node.js Scripts**: Use TypeScript where possible

## File and Directory Structure Patterns

### Documentation Structure

```bash
docs/
├── admin/              # Administrator guides
├── user/               # User guides
├── developer/          # Developer documentation
├── api/                # API documentation
└── assets/             # Images, diagrams
```

## Testing Guidelines

### CLI Testing

- Use pytest as the test framework
- Use Click's `CliRunner` for testing CLI commands instead of subprocess
- Mock external dependencies (file system, Docker, configuration)
- Test both success and error scenarios
- Verify command output and exit codes
- Keep tests isolated and fast

### Client Testing

- Use Jest, React and Playwright Testing Libraries
- Test user interactions and component behavior
- Mock external API calls
- Aim for high component test coverage

### Server Testing

- Use Jest for Node.js services
- Use pytest for Python services
- Test API endpoints with proper HTTP status codes
- Mock external dependencies (databases, external APIs)
- Include integration tests for critical paths

### Documentation Testing

- Validate all links work correctly
- Ensure examples are up-to-date with current API

## Docker and Infrastructure

### Docker Best Practices

- Use official base images
- Minimize image layers
- Use .dockerignore files
- Set proper user permissions
- Include health checks

### Traefik Configuration

- Configure proper routing rules
- Implement TLS termination
- Use middleware for authentication
- Set up proper load balancing

## Security Considerations

### General Security

- Never commit sensitive data
- Use environment variables for secrets
- Implement proper input validation
- Use HTTPS everywhere
- Follow OWASP security guidelines

## Documentation Standards

### Code Documentation

- Use JSDoc for TypeScript/JavaScript
- Use docstrings for Python
- Document complex algorithms and business logic
- Include usage examples

### User Documentation

- Write clear step-by-step guides
- Include screenshots and diagrams
- Provide troubleshooting sections
- Keep documentation up-to-date

## Git and Version Control

### Commit Standards

- Use conventional commit format
- Write clear, descriptive commit messages
- Keep commits atomic and focused
- Reference issue numbers when applicable

### Branch Strategy

- Use feature branches for new development
- Implement proper code review process
- Use semantic versioning for releases
- Tag releases appropriately

## When Generating Code

### Always Include

- Proper type annotations (TypeScript/Python)
- Appropriate error handling
- Relevant unit tests when possible
- Security considerations
- Performance implications
- Documentation/comments for complex logic

### Consider

- Existing patterns and conventions in the specific directory
- Integration with other services
- Configuration requirements
- Deployment implications
- Backwards compatibility

### Avoid

- Hardcoded values (use configuration)
- Insecure practices
- Performance anti-patterns
- Breaking existing APIs without versioning
- Inconsistent error handling patterns

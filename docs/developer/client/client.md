# React Website

The website serves as the primary interface through which end-users
interact with the DTaaS platform. The application is implemented as a
React single page web application, providing a modern and responsive
user experience for digital twin management operations.

## Architecture Overview

The client application follows a layered architecture pattern, separating
concerns into distinct modules for routing, state management, UI components,
and backend communication. The application employs Redux Toolkit for
centralized state management and implements the Strategy pattern for
backend abstraction, enabling support for multiple storage and execution
backends.

### Core Architecture Patterns

The backend communication layer implements interfaces, the builder pattern,
and dependency injection to achieve backend-agnostic operations. Each domain
object (e.g., `DigitalTwin`, `LibraryAsset`) receives its backend dependency
at construction time, allowing different backends to be used interchangeably.

## Package Structure

```text
client/
├── src/                           # Application source code
│   ├── index.tsx                  # Application entry point
│   ├── AppProvider.tsx            # Redux and theme providers
│   ├── routes.tsx                 # Route definitions
│   ├── components/                # Reusable UI components
│   │   ├── asset/                 # Asset-related components
│   │   ├── execution/             # Execution history components
│   │   ├── logDialog/             # Log display dialogs
│   │   ├── route/                 # Route-specific components
│   │   └── tab/                   # Tab navigation components
│   ├── model/                     # Domain models and backend layer
│   │   └── backend/               # Backend abstraction layer
│   │       ├── interfaces/        # Interface definitions
│   │       ├── gitlab/            # GitLab implementation
│   │       ├── state/             # Backend state slices
│   │       └── util/              # Backend utilities
│   ├── page/                      # Page layout components
│   │   ├── Layout.tsx             # Main authenticated layout
│   │   ├── LayoutPublic.tsx       # Public pages layout
│   │   └── Menu.tsx               # Navigation menu
│   ├── route/                     # Feature route modules
│   │   ├── account/               # User account management
│   │   ├── auth/                  # Authentication flow
│   │   ├── config/                # Configuration pages
│   │   ├── digitaltwins/          # Digital twin management
│   │   ├── library/               # Library asset browsing
│   │   └── workbench/             # User workbench interface
│   ├── store/                     # Redux state management
│   │   ├── store.ts               # Store configuration
│   │   ├── auth.slice.ts          # Authentication state
│   │   ├── menu.slice.ts          # Menu navigation state
│   │   ├── settings.slice.ts      # Application settings
│   │   └── snackbar.slice.ts      # Notification state
│   ├── util/                      # Utility functions
│   │   ├── auth/                  # Authentication utilities
│   │   ├── configUtil.ts          # Configuration helpers
│   │   └── envUtil.ts             # Environment utilities
│   ├── preview/                   # DevOps preview features (need refactoring)
│   │   ├── components/            # Preview UI components
│   │   ├── route/                 # Preview routes
│   │   ├── store/                 # Preview state
│   │   └── util/                  # Preview utilities
│   └── database/                  # Static configuration data
├── test/                          # Test suites
│   ├── unit/                      # Unit tests (Jest)
│   ├── integration/               # Integration tests
│   ├── e2e/                       # End-to-end tests (Playwright)
│   └── preview/                   # Preview feature tests
├── public/                        # Static assets
└── config/                        # Build configurations
    ├── dev.js                     # Development config
    ├── prod.js                    # Production config
    └── test.js                    # Test environment config
```

## Key Components

### Backend Abstraction Layer

The `model/backend/` directory implements a pluggable backend architecture:

| Component          | Purpose                                          |
| :----------------- | :----------------------------------------------- |
| `Backend`          | Interface for server communication               |
| `Instance`         | Maintains backend connection state and logs      |
| `DigitalTwin`      | Domain model for digital twin operations         |
| `LibraryAsset`     | Domain model for library asset management        |
| `FileHandler`      | Handles file operations across backends          |

### State Management

Redux slices manage application state:

| Slice               | Purpose                                          |
| :------------------ | :----------------------------------------------- |
| `auth.slice`        | Authentication state and user session            |
| `menu.slice`        | Navigation menu visibility and selection         |
| `settings.slice`    | Application preferences and configuration        |
| `snackbar.slice`    | Toast notifications and alerts                   |
| `digitalTwin.slice` | Digital twin execution state                     |

### Route Modules

Feature modules organized by domain:

| Module             | Purpose                                          |
| :----------------- | :----------------------------------------------- |
| `digitaltwins/`    | Create, execute, and monitor digital twins       |
| `library/`         | Browse and manage reusable assets                |
| `workbench/`       | Interactive user workspace interface             |
| `account/`         | User profile and settings management             |

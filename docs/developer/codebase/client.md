# React Client :computer:

The DTaaS web client is a React + TypeScript single page application.
It provides user-facing workflows for DT composition, asset browsing,
configuration, and DevOps-driven execution.

## Current Stack

- React 19
- React Router 7
- Redux Toolkit 2
- Material UI 7
- Gitbeaker REST client for GitLab APIs

## Current Source Layout

```text
client/
├── src/
│   ├── index.tsx
│   ├── AppProvider.tsx
│   ├── routes.tsx
│   ├── components/
│   ├── database/
│   ├── model/
│   │   └── backend/
│   │       ├── interfaces/
│   │       ├── gitlab/
│   │       ├── util/
│   │       └── ...
│   ├── page/
│   ├── route/
│   ├── store/
│   ├── util/
│   └── utils/
├── test/
│   ├── __mocks__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── config/
├── public/
└── package.json
```

## Backend Integration Layer

The backend model layer in `src/model/backend/` encapsulates GitLab-backed operations.

Key classes:

- `GitlabAPI`: low-level GitLab REST wrapper.
- `GitlabInstance`: project and trigger-token context.
- `DigitalTwin`: DT-level operations and execution history integration.
- `LibraryAsset`: reusable asset access patterns.

Important capability:

- Batched file updates through `commitMultipleActions`, enabling one commit for
    multiple create/update/delete operations.

## Build and Test Commands

Run from `client/`:

```bash
yarn syntax
yarn test:unit
yarn test:int
yarn test:e2e
yarn build
```

## Notes for Contributors

- Keep GitLab-specific logic in backend implementation modules.
- Keep route/view components focused on presentation and user workflows.
- Prefer typed interfaces in `model/backend/interfaces/` when extending API contracts.

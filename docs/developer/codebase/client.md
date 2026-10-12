# React Client :computer:

The DTaaS web client is a React and TypeScript single page application.
Users compose digital twins, browse assets, edit configuration and run
digital twins through GitLab pipelines from it.

## Current Stack

- React 19
- React Router 7
- Redux Toolkit 2
- Material UI 9
- Vite 8 for the development server and production build
- Gitbeaker REST client for GitLab APIs
- Jest 30 and React Testing Library for unit and integration tests,
  Playwright for end-to-end tests

## Current Source Layout

```text
client/
├── src/
│   ├── index.tsx
│   ├── AppProvider.tsx
│   ├── routes.tsx
│   ├── components/
│   ├── database/
│   ├── page/
│   ├── route/
│   ├── store/
│   ├── theme/
│   ├── util/
│   └── utils/
├── test/
│   ├── __mocks__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── config/
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

The `route/` directory holds one folder per page, including `bim/` for
the Building Models page. The Material UI theme and design tokens live
in `theme/`.

The shared backend package lives under `lib/dt-automation/` and the
client consumes it from npm as `@into-cps-association/dt-automation`.
The Building Models page comes from `@into-cps-association/bim-kit`,
which is maintained in the
[ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils)
repository. [Client Extensions](../system/extensions.md) describes both
packages and the proposed extension architecture.

## Backend Integration Layer

The `dt-automation` package wraps the GitLab-backed operations.

The main classes are:

- `GitlabAPI`: low-level GitLab REST wrapper.
- `GitlabInstance`: project and trigger-token context.
- `DigitalTwin`: DT-level operations and execution history integration.
- `LibraryAsset`: access to reusable library assets.

`commitMultipleActions` batches file updates, so one commit can carry
several create, update and delete operations.

## Build and Test Commands

Run from `client/`:

```bash
yarn syntax
yarn build
yarn config:test
yarn test:unit
yarn test:int
yarn test:e2e
```

Use the `test:unit` and `test:int` scripts rather than bare `jest`. The
scripts pass `--setupFilesAfterEnv`, which installs the `react-redux`
mock that many tests need.

## Notes for Contributors

- Keep GitLab-specific logic in backend implementation modules.
- Keep route and view components focused on presentation and user
  workflows.
- Prefer typed interfaces in `lib/dt-automation/src/interfaces/` when extending
  API contracts.

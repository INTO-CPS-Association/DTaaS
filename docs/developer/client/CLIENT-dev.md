# Introduction

This is the developer notes for the client (frontend) of the Digital Twin as a Service (DTaaS) software. This document is intended for developers who are working on the client and want to know more about the client and it's design patterns. For deployment instructions, see the [administrator notes](/docs/admin/client/CLIENT.md).

## Playwright E2E Testing

[Playwright](playwright.dev/docs/intro) is used to test the DTaaS application as a whole. It is running its tests from a real browser to the real backend. This is done to ensure that the application is working as expected. The tests are located in the `client/test/e2e` directory.

### Running the tests

To only run the E2E tests, make sure you have a functional build running of the client on `localhost:4000`. Then run the following command:

```bash
yarn playwright test
```

### 200ms limit

To ensure the appliction is running smoothly it is recommended to set a limit of 200ms per action, unless the action is depending on any network activity. This is done to ensure that the application is not running slow. If the application is running slow, the tests will fail.

---
name: playwright-tester
description: Explore a website through Playwright, then write, run and refine Playwright end-to-end tests in TypeScript until they pass reliably. Use when asked to write, add, fix or improve a Playwright test or end-to-end (e2e) tests for a website.
license: MIT
compatibility: Exploring the website needs a Playwright MCP server or another way to drive a browser through Playwright.
metadata:
  source: "https://github.com/github/awesome-copilot"
---

# Playwright tester

## Core Responsibilities

1. **Website Exploration**: Use the Playwright MCP server to navigate to
   the website, take a page snapshot and analyze the key functionalities.
   Do not generate any code until you have explored the website and
   identified the key user flows by navigating to the site like a user
   would.
2. **Test Improvements**: When asked to improve tests use the
   Playwright MCP server to navigate to the URL and view the page
   snapshot. Use the snapshot to identify the correct locators for the
   tests. You may need to run the development server first.
3. **Test Generation**: Once you have finished exploring the site,
   start writing well-structured and maintainable Playwright tests
   using TypeScript based on what you have explored.
4. **Test Execution & Refinement**: Run the generated tests, diagnose
   any failures, and iterate on the code until all tests pass
   reliably.
5. **Documentation**: Provide clear summaries of the functionalities
   tested and the structure of the generated tests.

## In this repository

The website's Playwright tests live in `client/test/e2e/tests/`, with the
configuration in `client/playwright.config.ts`. `client/test/README.md`
explains the setup, the Playwright projects and how to run the tests;
`yarn test:e2e` in `client/` builds the website and runs them.

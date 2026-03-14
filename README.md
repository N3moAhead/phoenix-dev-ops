# phoenix-dev-ops

[![CI/CD Pipeline](https://github.com/N3moAhead/phoenix-dev-ops/actions/workflows/ci.yml/badge.svg)](https://github.com/N3moAhead/phoenix-dev-ops/actions/workflows/ci.yml)

A TypeScript npm package that serves Markdown documentation over Express as styled
HTML pages.

Each rendered page also includes a lightweight summary card with:

- an estimated reading time
- a word count
- detected markdown headings
- the first paragraph as a quick excerpt

This repository was also used as a DevOps course project to demonstrate a
multi-stage CI/CD pipeline with formatting, linting, unit tests, integration
tests, and deployment packaging.

## Features

- Markdown-to-HTML rendering via `marked`
- Express-based docs server with configurable `docsDir`, `basePath`, and title
- Route resolution for flat files and nested `index.md` pages
- Automatic document summary generation
- Unit and integration tests with Vitest
- GitHub Actions workflow for formatting, linting, automated testing, and
  deployment artifacts

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install phoenix-dev-ops
```

## Usage

### Start the docs server

```ts
import { startDocsServer } from "phoenix-dev-ops";

startDocsServer({
  docsDir: "./docs",
  basePath: "/docs",
  title: "My Docs",
  port: 3000,
});
```

### Route mapping rules

- `/docs` -> `docs/index.md`
- `/docs/getting-started` -> `docs/getting-started.md`
- `/docs/api` -> `docs/api/index.md`

### Included demo content

The repository includes a ready-to-use demo document set under `examples/docs/`.
It is intended for local manual testing and course presentations.

Example routes when `docsDir` points to `./examples/docs`:

- `/docs` -> `examples/docs/index.md`
- `/docs/getting-started` -> `examples/docs/getting-started.md`
- `/docs/api` -> `examples/docs/api/index.md`

### What the rendered page contains

For every Markdown page, the server renders:

- the formatted HTML content
- a summary card with reading time, word count, and section count
- a list of detected headings
- an excerpt based on the first paragraph

## Public API

### `startDocsServer(options)`

Starts the Express server immediately.

Options:

- `docsDir`: directory that contains the Markdown files
- `basePath`: optional URL prefix such as `/docs`
- `title`: optional HTML page title
- `port`: optional server port, default is `3000`

### `createDocsApp(options)`

Creates and returns the Express application without starting a listener. This is
useful for testing or embedding the server into another application.

### `summarizeDocument(markdown)`

Builds a document summary from raw Markdown and returns:

- `excerpt`
- `headings`
- `sectionCount`
- `wordCount`
- `readingTimeMinutes`

Example:

```ts
import { summarizeDocument } from "phoenix-dev-ops";

const summary = summarizeDocument(`# Demo

This page explains the release process.

## Checklist
- Build
- Test
- Deploy
`);
```

## Development

### Install dependencies

```bash
npm ci
```

### Available scripts

```bash
npm run format
npm run lint
npm run build
npm run test:unit
npm run test:integration
npm run deploy:test
npm run verify
```

What each script does:

- `format`: formats the repository with Prettier
- `lint`: runs ESLint on the TypeScript source and test files
- `build`: compiles TypeScript into ESM output under `dist/`
- `test:unit`: runs the unit test suite
- `test:integration`: runs the integration test suite
- `deploy:prepare`: prepares the deployment target from the current build output
- `deploy:test`: rebuilds the project and simulates the deployment step locally
- `verify`: runs lint, build, unit tests, and integration tests in sequence

### Suggested local validation order

```bash
npm ci
npm run format
npm run lint
npm run build
npm run test:unit
npm run test:integration
npm run deploy:test
```

Or run the combined verification command:

```bash
npm run verify
```

## Test Strategy

### Unit tests

The unit tests focus on small, isolated behavior:

- Markdown summary extraction in `src/documentSummary.ts`
- HTML response rendering and route handling in `createDocsApp`

### Integration tests

The integration tests validate the interaction between the Express app and real
Markdown fixtures, including:

- serving `index.md`
- serving nested routes
- handling custom base paths
- returning `404` responses for missing documents
- rendering the summary card in real responses

## Project Structure

```text
.
|-- .github/workflows/ci.yml
|-- src/
|   |-- index.ts
|   `-- documentSummary.ts
|-- examples/
|   `-- docs/
|       |-- index.md
|       |-- getting-started.md
|       `-- api/index.md
|-- tests/
|   |-- index.test.ts
|   |-- document-summary.test.ts
|   `-- integration.test.ts
|-- package.json
|-- tsconfig.json
`-- README.md
```

## CI/CD Pipeline

The GitHub Actions workflow is defined in `.github/workflows/ci.yml`.

### Triggers

The pipeline runs on:

- pushes to `main`
- pull requests targeting `main`
- manual execution through `workflow_dispatch`

### Implemented jobs

#### 1. Format Code and Commit

- installs dependencies with `npm ci`
- formats the repository with Prettier
- checks whether files changed
- commits formatting changes back to the branch through
  `stefanzweifel/git-auto-commit-action`
- includes source files, tests, Markdown files, workflow files, and key config
  files in the formatting commit scope

This keeps the codebase consistently formatted and reduces style-only review
noise.

#### 2. Lint Code

- waits for the formatting job
- installs dependencies
- runs ESLint

This catches common code-quality issues before tests run.

#### 3. Run Unit Tests

- waits for the formatting job
- installs dependencies
- runs the unit test suite with Vitest

This validates isolated logic such as summary generation and focused app
behavior.

#### 4. Run Integration Tests

- installs dependencies
- builds the project
- runs the integration test suite with Vitest

This verifies that the Express app, Markdown input, and route resolution work
together end to end.

#### 5. Package and Deploy Artifact

- waits for linting and both test stages
- rebuilds the project
- prepares a deployment target directory from the build output
- writes deployment metadata for traceability
- uploads the deployed bundle as a GitHub Actions artifact

This provides a concrete deploy stage without requiring a live production
registry or external server.

#### 6. Publish to npm

A publish job scaffold is present in the workflow file but is currently
commented out. It can be activated later once the package release process is
ready.

## Notes for Contributors

- Generated directories such as `node_modules/`, `dist/`, `dist-test/`, and
  `.npm-cache/` should not be committed
- `package-lock.json` should be committed so CI uses deterministic installs
- If the format job changes files in CI, it may create an automated formatting
  commit on the branch

## Build

```bash
npm run build
```

This compiles TypeScript into ESM files under `dist/`.

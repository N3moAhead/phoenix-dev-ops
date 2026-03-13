# phoenix-dev-ops

A TypeScript npm package to serve markdown docs over Express as styled HTML pages.

Each rendered page also includes a lightweight summary card with:

- an estimated reading time
- a word count
- detected markdown headings
- the first paragraph as a quick excerpt

## Install

```bash
npm install phoenix-dev-ops
```

## Usage

```ts
import { startDocsServer } from "phoenix-dev-ops";

startDocsServer({
  docsDir: "./docs",
  basePath: "/docs",
  title: "My Docs",
  port: 3000,
});
```

Route mapping rules:

- `/docs` -> `docs/index.md`
- `/docs/getting-started` -> `docs/getting-started.md`
- `/docs/api` -> `docs/api/index.md`

## Build

```bash
npm run build
```

This compiles TypeScript into ESM files under `dist/`.

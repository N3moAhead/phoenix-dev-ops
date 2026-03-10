import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createDocsApp } from "../src/index.js";

const resources: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(resources.splice(0).reverse().map((cleanup) => cleanup()));
});

async function createDocsFixture(files: Record<string, string>) {
  const docsDir = await mkdtemp(path.join(tmpdir(), "phoenix-docs-"));
  resources.push(() => rm(docsDir, { recursive: true, force: true }));

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(docsDir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }

  return docsDir;
}

describe("Unit Tests: Docs Server", () => {
  it("serves index.md from the root route", async () => {
    const docsDir = await createDocsFixture({
      "index.md": "# Welcome\n\nThis is the homepage."
    });

    const app = createDocsApp({ docsDir });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/html");
    expect(response.text).toContain("<title>Documentation</title>");
    expect(response.text).toContain("<h1>Welcome</h1>");
    expect(response.text).toContain("This is the homepage.");
  });

  it("normalizes a custom base path and applies the configured title", async () => {
    const docsDir = await createDocsFixture({
      "getting-started.md": "## Getting Started",
      "api/index.md": "# API Reference"
    });

    const app = createDocsApp({
      docsDir,
      basePath: "/docs/",
      title: "Team Docs"
    });

    const gettingStarted = await request(app).get("/docs/getting-started");
    expect(gettingStarted.status).toBe(200);
    expect(gettingStarted.text).toContain("<h2>Getting Started</h2>");

    const apiOverview = await request(app).get("/docs/api");
    expect(apiOverview.status).toBe(200);
    expect(apiOverview.text).toContain("<title>Team Docs</title>");
    expect(apiOverview.text).toContain("<h1>API Reference</h1>");
  });

  it("returns a JSON 404 response when no markdown file matches the route", async () => {
    const docsDir = await createDocsFixture({
      "index.md": "# Home"
    });

    const app = createDocsApp({ docsDir });
    const response = await request(app).get("/missing-page");

    expect(response.status).toBe(404);
    expect(response.type).toBe("application/json");
    expect(response.body).toEqual({
      error: "Not Found",
      message: "No markdown file found for route /missing-page"
    });
  });
});

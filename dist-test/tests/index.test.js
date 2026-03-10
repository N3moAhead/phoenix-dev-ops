import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { createDocsApp } from "../src/index.js";
const resources = [];
afterEach(async () => {
    await Promise.all(resources.splice(0).reverse().map((cleanup) => cleanup()));
});
async function createDocsFixture(files) {
    const docsDir = await mkdtemp(path.join(tmpdir(), "phoenix-docs-"));
    resources.push(() => rm(docsDir, { recursive: true, force: true }));
    for (const [relativePath, content] of Object.entries(files)) {
        const absolutePath = path.join(docsDir, relativePath);
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, content, "utf8");
    }
    return docsDir;
}
async function withServer(docsDir, requestPath, options) {
    const app = createDocsApp({ docsDir, ...options });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance));
    });
    resources.push(() => new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    }));
    const address = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Expected an ephemeral TCP port for the test server.");
    }
    return fetch(`http://127.0.0.1:${address.port}${requestPath}`);
}
test("serves index.md from the root route", async () => {
    const docsDir = await createDocsFixture({
        "index.md": "# Welcome\n\nThis is the homepage."
    });
    const response = await withServer(docsDir, "/");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    const html = await response.text();
    assert.match(html, /<title>Documentation<\/title>/);
    assert.match(html, /<h1>Welcome<\/h1>/);
    assert.match(html, /This is the homepage\./);
});
test("resolves markdown files and nested index routes under a custom base path", async () => {
    const docsDir = await createDocsFixture({
        "getting-started.md": "## Getting Started",
        "api/index.md": "# API Reference"
    });
    const gettingStarted = await withServer(docsDir, "/docs/getting-started", {
        basePath: "/docs/",
        title: "Team Docs"
    });
    assert.equal(gettingStarted.status, 200);
    assert.match(await gettingStarted.text(), /<h2>Getting Started<\/h2>/);
    const apiOverview = await withServer(docsDir, "/docs/api", {
        basePath: "/docs/",
        title: "Team Docs"
    });
    assert.equal(apiOverview.status, 200);
    const html = await apiOverview.text();
    assert.match(html, /<title>Team Docs<\/title>/);
    assert.match(html, /<h1>API Reference<\/h1>/);
});
test("returns a JSON 404 response when no markdown file matches the route", async () => {
    const docsDir = await createDocsFixture({
        "index.md": "# Home"
    });
    const response = await withServer(docsDir, "/missing-page");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(await response.json(), {
        error: "Not Found",
        message: "No markdown file found for route /missing-page"
    });
});

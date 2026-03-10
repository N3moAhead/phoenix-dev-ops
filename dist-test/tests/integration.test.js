import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { createDocsApp } from "../src/index.js";
describe("Integration Tests: Docs Server", () => {
    const docsDir = path.resolve(__dirname, "__fixtures__", "docs");
    beforeAll(async () => {
        // Setup temporary markdown files
        await mkdir(docsDir, { recursive: true });
        await writeFile(path.join(docsDir, "index.md"), "# Home\nWelcome to home.");
        await writeFile(path.join(docsDir, "about.md"), "# About\nAbout page.");
        await mkdir(path.join(docsDir, "nested"), { recursive: true });
        await writeFile(path.join(docsDir, "nested", "index.md"), "# Nested\nNested index.");
    });
    afterAll(async () => {
        // Cleanup
        await rm(path.resolve(__dirname, "__fixtures__"), {
            recursive: true,
            force: true,
        });
    });
    it("serves the root index.md at /", async () => {
        const app = createDocsApp({ docsDir });
        const response = await request(app).get("/");
        expect(response.status).toBe(200);
        expect(response.type).toBe("text/html");
        expect(response.text).toContain("Welcome to home.");
        expect(response.text).toContain("<h1>Home</h1>");
    });
    it("serves about.md at /about", async () => {
        const app = createDocsApp({ docsDir });
        const response = await request(app).get("/about");
        expect(response.status).toBe(200);
        expect(response.text).toContain("<h1>About</h1>");
        expect(response.text).toContain("About page.");
    });
    it("serves nested index.md at /nested", async () => {
        const app = createDocsApp({ docsDir });
        const response = await request(app).get("/nested");
        expect(response.status).toBe(200);
        expect(response.text).toContain("<h1>Nested</h1>");
    });
    it("returns 404 for non-existent file", async () => {
        const app = createDocsApp({ docsDir });
        const response = await request(app).get("/missing");
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: "Not Found",
            message: "No markdown file found for route /missing",
        });
    });
    it("works with a custom basePath", async () => {
        const app = createDocsApp({ docsDir, basePath: "/docs" });
        const response = await request(app).get("/docs/about");
        expect(response.status).toBe(200);
        expect(response.text).toContain("About page.");
    });
});

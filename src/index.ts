import express, { type Express } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

import { summarizeDocument, type DocumentSummary } from "./documentSummary.js";

export interface DocsServerOptions {
  docsDir: string;
  basePath?: string;
  title?: string;
}

export interface StartServerOptions extends DocsServerOptions {
  port?: number;
}

const DEFAULT_TITLE = "Documentation";
const DEFAULT_BASE_PATH = "/";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function normalizeBasePath(basePath: string): string {
  const normalized = `/${basePath}`.replace(/\/+/, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDocumentSummary(summary: DocumentSummary): string {
  const headingList =
    summary.headings.length === 0
      ? ""
      : `<ul class="doc-summary__headings">${summary.headings
          .map(
            (heading) =>
              `<li><span class="doc-summary__heading-level">H${heading.level}</span>${escapeHtml(
                heading.text,
              )}</li>`,
          )
          .join("")}</ul>`;

  return `<section class="doc-summary" aria-label="Document summary">
    <div class="doc-summary__stats">
      <div class="doc-summary__stat">
        <span class="doc-summary__label">Reading time</span>
        <strong>${summary.readingTimeMinutes} min</strong>
      </div>
      <div class="doc-summary__stat">
        <span class="doc-summary__label">Words</span>
        <strong>${summary.wordCount}</strong>
      </div>
      <div class="doc-summary__stat">
        <span class="doc-summary__label">Sections</span>
        <strong>${summary.sectionCount}</strong>
      </div>
    </div>
    <p class="doc-summary__excerpt">${escapeHtml(summary.excerpt)}</p>
    ${headingList}
  </section>`;
}

function htmlTemplate(
  title: string,
  summary: DocumentSummary,
  content: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #e2e8f0;
      --code-bg: #0f172a;
      --code-text: #e2e8f0;
      --link: #0369a1;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1rem;
      background: radial-gradient(circle at top, #e0f2fe, var(--bg) 40%);
      color: var(--text);
      font: 16px/1.6 "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    main {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
    }
    h1, h2, h3, h4 {
      line-height: 1.2;
      margin-top: 2rem;
    }
    h1 { margin-top: 0; }
    a { color: var(--link); }
    p, li { color: var(--muted); }
    code {
      padding: 0.15rem 0.35rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #1e293b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    pre {
      overflow-x: auto;
      border-radius: 8px;
      background: var(--code-bg);
      color: var(--code-text);
      padding: 1rem;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    blockquote {
      margin: 1rem 0;
      padding: 0.5rem 1rem;
      border-left: 4px solid #7dd3fc;
      background: #f0f9ff;
      color: #0c4a6e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem;
      text-align: left;
    }
    .doc-summary {
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: linear-gradient(135deg, #eff6ff, #f8fafc);
    }
    .doc-summary__stats {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    .doc-summary__stat {
      padding: 0.75rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.25);
    }
    .doc-summary__label {
      display: block;
      margin-bottom: 0.25rem;
      color: #475569;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-summary__excerpt {
      margin: 1rem 0 0;
      color: #1e293b;
    }
    .doc-summary__headings {
      margin: 1rem 0 0;
      padding-left: 1.1rem;
      color: #334155;
    }
    .doc-summary__headings li + li {
      margin-top: 0.35rem;
    }
    .doc-summary__heading-level {
      display: inline-block;
      min-width: 2.1rem;
      margin-right: 0.5rem;
      font-size: 0.8rem;
      color: #0369a1;
      font-weight: 700;
    }
    article > :first-child {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <main>
    ${renderDocumentSummary(summary)}
    <article>${content}</article>
  </main>
</body>
</html>`;
}

function resolveRequestedFile(docsDir: string, reqPath: string): string[] {
  const safePath = path.posix
    .normalize(`/${reqPath}`)
    .replace(/^\/+/, "")
    .replace(/\.\.(\/|\\|$)/g, "");

  const candidates =
    safePath === ""
      ? ["index.md"]
      : [safePath, `${safePath}.md`, path.posix.join(safePath, "index.md")];

  return candidates.map((candidate) =>
    path.resolve(
      docsDir,

      candidate,
    ),
  );
}

export function createDocsApp(options: DocsServerOptions): Express {
  const docsDir = path.resolve(options.docsDir);
  const title = options.title ?? DEFAULT_TITLE;
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_BASE_PATH);

  const app = express();

  const routes =
    basePath === "/" ? ["/", "/*docPath"] : [basePath, `${basePath}/*docPath`];

  app.get(routes, async (req, res) => {
    const reqPath = (req.params.docPath as string | undefined) ?? "";
    const candidates = resolveRequestedFile(docsDir, reqPath);

    for (const candidate of candidates) {
      if (!candidate.startsWith(docsDir)) {
        continue;
      }

      try {
        const markdown = await readFile(candidate, "utf8");
        const renderedHtml = await marked.parse(markdown);
        const summary = summarizeDocument(markdown);

        res
          .status(200)
          .type("html")
          .send(htmlTemplate(title, summary, renderedHtml));
        return;
      } catch {
        // Missing/unreadable file, continue to next candidate.
      }
    }

    res.status(404).json({
      error: "Not Found",
      message: `No markdown file found for route /${reqPath}`,
    });
  });

  return app;
}

export function startDocsServer(options: StartServerOptions) {
  const port = options.port ?? 3000;
  const app = createDocsApp(options);

  return app.listen(port, () => {
    console.log(`Docs server running at http://localhost:${port}`);
  });
}

export { summarizeDocument };
export type { DocumentHeading, DocumentSummary } from "./documentSummary.js";

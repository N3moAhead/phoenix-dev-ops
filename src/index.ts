import express, { type Express } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

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
  breaks: true
});

function normalizeBasePath(basePath: string): string {
  const normalized = `/${basePath}`.replace(/\/+/, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

function htmlTemplate(title: string, content: string): string {
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
  </style>
</head>
<body>
  <main>${content}</main>
</body>
</html>`;
}

function resolveRequestedFile(docsDir: string, reqPath: string): string[] {
  const safePath = path.posix
    .normalize(`/${reqPath}`)
    .replace(/^\/+/, "")
    .replace(/\.\.(\/|\\|$)/g, "");

  const candidates = safePath === ""
    ? ["index.md"]
    : [safePath, `${safePath}.md`, path.posix.join(safePath, "index.md")];

  return candidates.map((candidate) => path.resolve(docsDir, candidate));
}

export function createDocsApp(options: DocsServerOptions): Express {
  const docsDir = path.resolve(options.docsDir);
  const title = options.title ?? DEFAULT_TITLE;
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_BASE_PATH);

  const app = express();

  const routes = basePath === "/" ? ["/", "/*docPath"] : [basePath, `${basePath}/*docPath`];

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

        res.status(200).type("html").send(htmlTemplate(title, renderedHtml));
        return;
      } catch {
        // Missing/unreadable file, continue to next candidate.
      }
    }

    res.status(404).json({
      error: "Not Found",
      message: `No markdown file found for route /${reqPath}`
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

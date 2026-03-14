import { describe, expect, it } from "vitest";

import { summarizeDocument } from "../src/documentSummary.js";

describe("Unit Tests: Document Summary", () => {
  it("extracts an excerpt, sections and reading stats from markdown", () => {
    const summary = summarizeDocument(`# Sprint Notes

This lightweight page explains the weekly habits for the team.

## Goals
- Keep changes small
- Ship safely

## Risks
Watch for dependency drift and flaky tests.
`);

    expect(summary.excerpt).toBe(
      "This lightweight page explains the weekly habits for the team.",
    );
    expect(summary.sectionCount).toBe(3);
    expect(summary.headings).toEqual([
      { level: 1, text: "Sprint Notes" },
      { level: 2, text: "Goals" },
      { level: 2, text: "Risks" },
    ]);
    expect(summary.wordCount).toBeGreaterThan(10);
    expect(summary.readingTimeMinutes).toBe(1);
  });

  it("ignores fenced code blocks when summarizing", () => {
    const summary = summarizeDocument(`## Example

\`\`\`ts
const hidden = "code words should not count";
\`\`\`

Keep the visible explanation concise.
`);

    expect(summary.headings).toEqual([{ level: 2, text: "Example" }]);
    expect(summary.excerpt).toBe("Keep the visible explanation concise.");
    expect(summary.wordCount).toBeLessThan(12);
  });

  it("falls back to a safe default excerpt for empty markdown", () => {
    const summary = summarizeDocument("");

    expect(summary.excerpt).toBe("No summary available yet.");
    expect(summary.sectionCount).toBe(0);
    expect(summary.wordCount).toBe(0);
    expect(summary.readingTimeMinutes).toBe(0);
  });
});

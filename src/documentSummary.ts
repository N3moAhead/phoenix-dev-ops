export interface DocumentHeading {
  level: number;
  text: string;
}

export interface DocumentSummary {
  excerpt: string;
  headings: DocumentHeading[];
  sectionCount: number;
  wordCount: number;
  readingTimeMinutes: number;
}

const DEFAULT_EXCERPT = "No summary available yet.";
const WORDS_PER_MINUTE = 180;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/^\s{0,3}>\s?/g, "")
    .replace(/^\s*[-*+]\s+/g, "")
    .replace(/^\s*\d+\.\s+/g, "")
    .trim();
}

function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu);
  return matches?.length ?? 0;
}

export function summarizeDocument(markdown: string): DocumentSummary {
  const headings: DocumentHeading[] = [];
  const paragraphBuffer: string[] = [];
  const paragraphs: string[] = [];
  let insideCodeFence = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    const paragraph = stripInlineMarkdown(paragraphBuffer.join(" ").trim());
    if (paragraph !== "") {
      paragraphs.push(paragraph);
    }

    paragraphBuffer.length = 0;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      insideCodeFence = !insideCodeFence;
      flushParagraph();
      continue;
    }

    if (insideCodeFence) {
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      headings.push({
        level: headingMatch[1].length,
        text: stripInlineMarkdown(headingMatch[2]),
      });
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  const combinedText = [
    headings.map((heading) => heading.text).join(" "),
    paragraphs.join(" "),
  ]
    .join(" ")
    .trim();
  const wordCount = countWords(combinedText);

  return {
    excerpt: paragraphs[0] ?? DEFAULT_EXCERPT,
    headings,
    sectionCount: headings.length,
    wordCount,
    readingTimeMinutes:
      wordCount === 0
        ? 0
        : Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
  };
}

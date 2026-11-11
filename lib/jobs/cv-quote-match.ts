export type OccurrenceSpan = { start: number; end: number };

/**
 * Normalizes typographic variants without changing string length, so index
 * mapping back to the original text stays exact.
 */
function normalizeQuoteChar(char: string): string {
  switch (char) {
    case "\u2018":
    case "\u2019":
    case "\u201A":
    case "\u201B":
      return "'";
    case "\u201C":
    case "\u201D":
    case "\u201E":
    case "\u201F":
      return '"';
    case "\u2013":
    case "\u2014":
    case "\u2212":
      return "-";
    case "\u00A0":
    case "\u202F":
      return " ";
    default:
      return char;
  }
}

/**
 * Locates a CV quote even when whitespace was normalized (line breaks
 * replaced by spaces, etc.). Returns spans in the original text so callers
 * can replace only the quoted passage without reformatting the rest.
 */
export function findQuoteSpans(haystack: string, needle: string): OccurrenceSpan[] {
  const trimmedNeedle = needle.trim();
  if (!trimmedNeedle) return [];

  let normalized = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;

  while (index < haystack.length) {
    const char = haystack[index];
    if (/\s/.test(char)) {
      const runStart = index;
      while (index < haystack.length && /\s/.test(haystack[index])) index += 1;
      normalized += " ";
      starts.push(runStart);
      ends.push(index - 1);
    } else {
      normalized += normalizeQuoteChar(char);
      starts.push(index);
      ends.push(index);
      index += 1;
    }
  }

  const normalizedNeedle = trimmedNeedle
    .replace(/\s+/g, " ")
    .split("")
    .map(normalizeQuoteChar)
    .join("");
  const spans: OccurrenceSpan[] = [];
  let from = 0;

  while (from <= normalized.length - normalizedNeedle.length) {
    const found = normalized.indexOf(normalizedNeedle, from);
    if (found === -1) break;
    const start = starts[found];
    const end = ends[found + normalizedNeedle.length - 1];
    if (start !== undefined && end !== undefined) {
      spans.push({ start, end });
    }
    from = found + Math.max(1, normalizedNeedle.length);
  }

  return spans;
}

/** Replaces a unique quote, or returns null when not found/ambiguous. */
export function replaceQuoteOnce(
  haystack: string,
  needle: string,
  replacement: string,
): string | null {
  const spans = findQuoteSpans(haystack, needle);
  if (spans.length !== 1) return null;
  const { start, end } = spans[0];
  return `${haystack.slice(0, start)}${replacement}${haystack.slice(end + 1)}`;
}

/** Inserts text on a new line after a unique quote. */
export function insertAfterQuoteOnce(
  haystack: string,
  anchor: string,
  addition: string,
): string | null {
  const spans = findQuoteSpans(haystack, anchor);
  if (spans.length !== 1) return null;
  const { end } = spans[0];
  return `${haystack.slice(0, end + 1)}\n${addition}${haystack.slice(end + 1)}`;
}

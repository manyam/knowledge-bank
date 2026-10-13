import type { CsvImportItem, SourceType } from './types.js';

export interface ParsedCsvSource extends CsvImportItem {
  rowNumber: number;
  originalLine: string;
}

export const SAMPLE_CSV_TEMPLATE = `url,title
https://news.ycombinator.com/rss,Hacker News Frontpage
https://simonwillison.net/atom/entries/,Simon Willison AI & Tech Blog
https://duckdb.org/feed.xml,DuckDB Official Blog
https://en.wikipedia.org/wiki/DuckDB,DuckDB Wikipedia Overview
https://www.anthropic.com/research,Anthropic AI Research
`;

/**
 * Splits a single CSV/TSV row into fields, respecting quotation marks.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Detects whether the delimiter is comma, tab, or semicolon.
 */
function detectDelimiter(lines: string[]): string {
  let commas = 0;
  let tabs = 0;
  let semicolons = 0;

  for (const line of lines.slice(0, 10)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    commas += (line.match(/,/g) || []).length;
    tabs += (line.match(/\t/g) || []).length;
    semicolons += (line.match(/;/g) || []).length;
  }

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas && semicolons > tabs) return ';';
  return ',';
}

/**
 * Checks if a string looks like a web URL.
 */
function looksLikeUrl(str: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('www.') ||
    s.startsWith('feed://') ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s)
  );
}

/**
 * Normalizes a URL, adding https:// if protocol is missing.
 */
export function normalizeUrl(str: string): string {
  let clean = str.trim();
  if (!clean) return '';
  if (clean.startsWith('feed://')) {
    clean = 'https://' + clean.slice(7);
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

/**
 * Parses CSV or plain text containing source URLs and optional titles/types.
 */
export function parseCsvSources(csvContent: string): ParsedCsvSource[] {
  if (!csvContent || !csvContent.trim()) {
    return [];
  }

  const rawLines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (rawLines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(rawLines);
  const results: ParsedCsvSource[] = [];

  // Inspect first line to check if it's a header
  const firstLineFields = parseCsvLine(rawLines[0], delimiter).map((f) => f.toLowerCase());
  let urlColIndex = -1;
  let titleColIndex = -1;
  let typeColIndex = -1;
  let isHeaderRow = false;

  for (let i = 0; i < firstLineFields.length; i++) {
    const header = firstLineFields[i].replace(/[^a-z0-9_]/g, '');
    if (['url', 'link', 'uri', 'address', 'feed', 'feedurl', 'website', 'webpage'].includes(header)) {
      urlColIndex = i;
      isHeaderRow = true;
    } else if (['title', 'name', 'label', 'description', 'source'].includes(header)) {
      titleColIndex = i;
      isHeaderRow = true;
    } else if (['type', 'kind', 'sourcetype', 'format'].includes(header)) {
      typeColIndex = i;
      isHeaderRow = true;
    }
  }

  // If first line contains a valid URL itself, it's not a header row
  if (firstLineFields.some((f) => looksLikeUrl(f))) {
    isHeaderRow = false;
    urlColIndex = -1;
    titleColIndex = -1;
    typeColIndex = -1;
  }

  const dataLines = isHeaderRow ? rawLines.slice(1) : rawLines;
  const startRowNumber = isHeaderRow ? 2 : 1;

  for (let i = 0; i < dataLines.length; i++) {
    const rawLine = dataLines[i];
    const fields = parseCsvLine(rawLine, delimiter);
    const rowNum = startRowNumber + i;

    let targetUrl = '';
    let targetTitle: string | undefined;
    let targetType: SourceType | 'auto' = 'auto';

    if (isHeaderRow && urlColIndex !== -1 && urlColIndex < fields.length) {
      targetUrl = fields[urlColIndex];
      if (titleColIndex !== -1 && titleColIndex < fields.length && fields[titleColIndex]) {
        targetTitle = fields[titleColIndex];
      }
      if (typeColIndex !== -1 && typeColIndex < fields.length) {
        const rawType = fields[typeColIndex].toLowerCase();
        if (rawType === 'rss' || rawType === 'feed') targetType = 'rss';
        else if (rawType === 'url' || rawType === 'web') targetType = 'url';
      }
    } else {
      // Headerless: Find which column contains a URL
      let foundUrlIndex = -1;
      for (let j = 0; j < fields.length; j++) {
        if (looksLikeUrl(fields[j])) {
          foundUrlIndex = j;
          targetUrl = fields[j];
          break;
        }
      }

      if (foundUrlIndex !== -1) {
        // If there's another non-empty field, treat as title
        for (let j = 0; j < fields.length; j++) {
          if (j !== foundUrlIndex && fields[j]) {
            const val = fields[j].trim();
            const lowerVal = val.toLowerCase();
            if (['rss', 'feed'].includes(lowerVal)) {
              targetType = 'rss';
            } else if (['url', 'web', 'article'].includes(lowerVal)) {
              targetType = 'url';
            } else if (!targetTitle) {
              targetTitle = val;
            }
          }
        }
      } else if (fields.length > 0 && fields[0]) {
        // Maybe it's a URL without scheme or domain
        targetUrl = fields[0];
        if (fields.length > 1 && fields[1]) {
          targetTitle = fields[1];
        }
      }
    }

    if (targetUrl && looksLikeUrl(targetUrl)) {
      results.push({
        url: normalizeUrl(targetUrl),
        title: targetTitle?.trim() || undefined,
        type: targetType,
        rowNumber: rowNum,
        originalLine: rawLine,
      });
    }
  }

  return results;
}

import Parser from 'rss-parser';
import type { DecipherResult, SourceType } from '../../../shared/types.js';

const rssParser = new Parser({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; KnowledgeBankBot/1.0; +https://github.com/knowledge-bank)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
  timeout: 8000,
});

/**
 * Automatically deciphers whether a given URL is an RSS/Atom feed or a standard Web article.
 *
 * 1. Probes the URL with rss-parser to see if it parses valid RSS/Atom XML directly.
 * 2. If parsing fails, performs an HTTP GET request to check Content-Type and inspect HTML/XML root markup.
 * 3. If unreachable or offline, applies URL structure heuristics.
 */
export async function decipherSourceType(rawUrl: string): Promise<DecipherResult> {
  let cleanUrl = rawUrl.trim();
  if (!cleanUrl) {
    throw new Error('URL cannot be empty');
  }

  // Ensure scheme
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // Probe 1: Direct RSS/Atom parsing
  try {
    const feed = await rssParser.parseURL(cleanUrl);
    if (feed && (feed.title || (feed.items && feed.items.length > 0))) {
      return {
        url: cleanUrl,
        type: 'rss',
        title: feed.title?.trim() || undefined,
        feedUrl: feed.feedUrl || cleanUrl,
        confidence: 'verified',
        reason: 'Successfully parsed RSS/Atom XML feed structure',
      };
    }
  } catch (rssErr: any) {
    // Normal for standard HTML webpages or slight feed formatting quirks
  }

  // Probe 2: HTTP fetch check
  try {
    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    // Check MIME type
    if (
      contentType.includes('application/rss+xml') ||
      contentType.includes('application/atom+xml')
    ) {
      return {
        url: cleanUrl,
        type: 'rss',
        confidence: 'verified',
        reason: `Server returned RSS/Atom MIME type: ${contentType}`,
      };
    }

    // Inspect content sample
    const sample = (await res.text()).slice(0, 4000);

    // Check XML root tags
    if (/<(rss|feed|rdf:RDF)[\s>]/i.test(sample)) {
      const titleMatch = sample.match(/<title[^>]*>([^<]+)<\/title>/i);
      return {
        url: cleanUrl,
        type: 'rss',
        title: titleMatch ? titleMatch[1].trim() : undefined,
        confidence: 'verified',
        reason: 'Detected XML <rss> or <feed> tags in body',
      };
    }

    // Check HTML webpage
    if (/<(!doctype\s+html|html)[\s>]/i.test(sample) || contentType.includes('text/html')) {
      const titleMatch = sample.match(/<title[^>]*>([^<]+)<\/title>/i);
      return {
        url: cleanUrl,
        type: 'url',
        title: titleMatch ? titleMatch[1].trim() : undefined,
        confidence: 'verified',
        reason: 'Detected standard HTML webpage',
      };
    }
  } catch (netErr: any) {
    // Network failed or blocked
  }

  // Probe 3: Heuristics based on URL naming conventions
  const lower = cleanUrl.toLowerCase();
  const isLikelyRss =
    lower.endsWith('.rss') ||
    lower.endsWith('.xml') ||
    lower.endsWith('/feed') ||
    lower.endsWith('/feed/') ||
    lower.endsWith('/rss') ||
    lower.endsWith('/rss/') ||
    lower.endsWith('/atom') ||
    lower.endsWith('/atom.xml') ||
    lower.includes('/rss/') ||
    lower.includes('/feed/') ||
    lower.includes('format=rss') ||
    lower.includes('output=rss');

  return {
    url: cleanUrl,
    type: isLikelyRss ? 'rss' : 'url',
    confidence: 'heuristic',
    reason: isLikelyRss
      ? 'URL structure matches RSS/Atom feed convention'
      : 'Defaulted to web article URL',
  };
}

/**
 * Deciphers a batch of URLs with controlled concurrency.
 */
export async function decipherSourcesBatch(urls: string[]): Promise<DecipherResult[]> {
  const results: DecipherResult[] = [];
  const chunkSize = 4;

  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (u) => {
        try {
          return await decipherSourceType(u);
        } catch (err: any) {
          return {
            url: u,
            type: 'url' as SourceType,
            confidence: 'fallback' as const,
            reason: err.message || 'Decipher failed',
          };
        }
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import crypto from 'crypto';

export interface ScrapedArticle {
  url: string;
  title: string;
  author?: string;
  publishedAt?: string;
  cleanText: string;
  excerpt?: string;
  contentHash: string;
}

export async function scrapeUrl(targetUrl: string): Promise<ScrapedArticle> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (compatible; KnowledgeBankBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${targetUrl}: HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();

    let title = parsed?.title?.trim() || '';
    let cleanText = parsed?.textContent?.trim() || '';
    let excerpt = parsed?.excerpt?.trim() || '';
    let author = parsed?.byline?.trim() || '';

    // Fallback if Readability fails
    if (!cleanText || cleanText.length < 50) {
      const doc = dom.window.document;
      // Remove scripts, styles, noscript
      const removeElements = doc.querySelectorAll('script, style, noscript, nav, header, footer');
      removeElements.forEach((el) => el.remove());

      title = title || doc.title || targetUrl;
      cleanText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
      excerpt = cleanText.slice(0, 300);
    }

    if (!cleanText || cleanText.length < 20) {
      throw new Error(`No readable content found at ${targetUrl}`);
    }

    // Normalized whitespace
    cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

    // SHA-256 hash for deduplication
    const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');

    return {
      url: targetUrl,
      title: title || targetUrl,
      author: author || undefined,
      publishedAt: new Date().toISOString(),
      cleanText,
      excerpt: excerpt || cleanText.slice(0, 250) + '...',
      contentHash,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout fetching URL: ${targetUrl} (exceeded 20s)`);
    }
    throw error;
  }
}

export function parseContentOrHtml(
  rawContent: string,
  targetUrl: string,
  customTitle?: string
): ScrapedArticle {
  const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
  let title = customTitle || '';
  let cleanText = '';
  let excerpt = '';
  let author: string | undefined;

  if (isHtml) {
    try {
      const dom = new JSDOM(rawContent, {
        url: targetUrl.startsWith('http') ? targetUrl : 'https://knowledgebank.local',
      });
      const reader = new Readability(dom.window.document);
      const parsed = reader.parse();

      if (parsed) {
        title = title || parsed.title?.trim() || '';
        cleanText = parsed.textContent?.trim() || '';
        excerpt = parsed.excerpt?.trim() || '';
        author = parsed.byline?.trim() || undefined;
      }

      if (!cleanText || cleanText.length < 50) {
        const doc = dom.window.document;
        doc
          .querySelectorAll('script, style, noscript, nav, header, footer')
          .forEach((el) => el.remove());
        title = title || doc.title || targetUrl;
        cleanText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
        excerpt = cleanText.slice(0, 300);
      }
    } catch (e) {
      // Fallback to text below
    }
  }

  if (!cleanText) {
    cleanText = rawContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!title) {
      const firstLine = cleanText.split('\n')[0]?.trim();
      title = firstLine && firstLine.length < 100 ? firstLine : targetUrl;
    }
    excerpt = cleanText.slice(0, 250) + '...';
  }

  if (!cleanText || cleanText.length < 10) {
    throw new Error('Provided content is too short to index');
  }

  const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');

  return {
    url: targetUrl,
    title: title || targetUrl,
    author,
    publishedAt: new Date().toISOString(),
    cleanText,
    excerpt,
    contentHash,
  };
}


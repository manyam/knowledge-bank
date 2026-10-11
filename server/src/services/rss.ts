import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, exec } from '../db/duckdb.js';
import { scrapeUrl } from './scraper.js';
import { chunkText } from './chunker.js';
import { generateEmbeddingsBatch } from './ollama.js';
import { config } from '../config.js';
import type { Source, Document } from '../../../shared/types.js';

const parser = new Parser({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; KnowledgeBankBot/1.0; +https://github.com/knowledge-bank)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
  timeout: 15000,
});

export async function parseRssFeed(feedUrl: string) {
  return await parser.parseURL(feedUrl);
}

export async function processAndIndexDocument(
  sourceId: string,
  url: string,
  articleData?: {
    title: string;
    cleanText: string;
    author?: string;
    publishedAt?: string;
    excerpt?: string;
    contentHash: string;
  }
): Promise<string> {
  // 1. Scrape if not provided
  const article = articleData || (await scrapeUrl(url));

  // 2. Check if already exists in DB
  const existingDoc = await queryOne<{ id: string; content_hash: string }>(
    'SELECT id, content_hash FROM documents WHERE url = ?',
    [url]
  );

  if (existingDoc && existingDoc.content_hash === article.contentHash) {
    console.log(`[Ingest] Document unchanged, skipping: ${url}`);
    return existingDoc.id;
  }

  const documentId = existingDoc ? existingDoc.id : uuidv4();

  // 3. Chunk text
  const chunks = chunkText(article.cleanText, config.chunkSize, config.chunkOverlap);

  // 4. Generate embeddings for all chunks
  let embeddings: number[][] = [];
  try {
    embeddings = await generateEmbeddingsBatch(chunks.map((c) => c.text));
  } catch (err: any) {
    console.warn(`[Ingest] Warning: Failed to generate embeddings for ${url}:`, err.message);
  }

  // 5. Update or insert document in DuckDB
  if (existingDoc) {
    // Delete old chunks first
    await exec('DELETE FROM chunks WHERE document_id = ?', [documentId]);
    await exec(
      `UPDATE documents 
       SET title = ?, author = ?, clean_text = ?, excerpt = ?, content_hash = ?, chunk_count = ?, status = 'indexed'
       WHERE id = ?`,
      [
        article.title,
        article.author || null,
        article.cleanText,
        article.excerpt || null,
        article.contentHash,
        chunks.length,
        documentId,
      ]
    );
  } else {
    await exec(
      `INSERT INTO documents (id, source_id, url, title, author, published_at, content_hash, clean_text, excerpt, chunk_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'indexed')`,
      [
        documentId,
        sourceId,
        url,
        article.title,
        article.author || null,
        article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
        article.contentHash,
        article.cleanText,
        article.excerpt || null,
        chunks.length,
      ]
    );
  }

  // 6. Insert chunks into DuckDB
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = uuidv4();
    const vec = embeddings[i];

    if (vec && vec.length > 0) {
      const vecLiteral = `[${vec.map((v) => (Number.isFinite(v) ? v : 0)).join(',')}]::FLOAT[]`;
      await exec(
        `INSERT INTO chunks (id, document_id, chunk_index, content, token_count, embedding)
         VALUES (?, ?, ?, ?, ?, ${vecLiteral})`,
        [chunkId, documentId, chunk.index, chunk.text, chunk.tokenCount]
      );
    } else {
      await exec(
        `INSERT INTO chunks (id, document_id, chunk_index, content, token_count, embedding)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        [chunkId, documentId, chunk.index, chunk.text, chunk.tokenCount]
      );
    }
  }

  console.log(`[Ingest] Indexed document "${article.title}" with ${chunks.length} chunks (${embeddings.length} vectors).`);
  return documentId;
}

export async function syncSource(sourceId: string): Promise<void> {
  const source = await queryOne<Source>(
    'SELECT id, type, url, title, feed_url as "feedUrl", status FROM sources WHERE id = ?',
    [sourceId]
  );

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  // Set status to syncing
  await exec("UPDATE sources SET status = 'syncing', error_message = NULL WHERE id = ?", [sourceId]);

  try {
    if (source.type === 'url') {
      await processAndIndexDocument(sourceId, source.url);
    } else if (source.type === 'rss') {
      const feed = await parseRssFeed(source.feedUrl || source.url);

      // Update feed title if not provided
      if (!source.title && feed.title) {
        await exec('UPDATE sources SET title = ?, description = ? WHERE id = ?', [
          feed.title,
          feed.description || null,
          sourceId,
        ]);
      }

      const items = feed.items || [];
      // Take up to 25 latest items to prevent rate limits
      const latestItems = items.slice(0, 25);

      for (const item of latestItems) {
        const itemUrl = item.link;
        if (!itemUrl) continue;

        try {
          // Attempt full scrape, or fallback to RSS contentSnippet
          try {
            await processAndIndexDocument(sourceId, itemUrl);
          } catch (scrapeErr: any) {
            console.warn(`[RSS] Scrape failed for ${itemUrl}, falling back to feed snippet:`, scrapeErr.message);
            const fallbackText = (item.content || item.contentSnippet || item.title || '').trim();
            if (fallbackText.length > 20) {
              const crypto = await import('crypto');
              const hash = crypto.createHash('sha256').update(fallbackText).digest('hex');
              await processAndIndexDocument(sourceId, itemUrl, {
                title: item.title || itemUrl,
                cleanText: fallbackText,
                author: item.creator || (item as any)['dc:creator'] || undefined,
                publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
                excerpt: item.contentSnippet?.slice(0, 200),
                contentHash: hash,
              });
            }
          }
        } catch (itemErr: any) {
          console.error(`[RSS] Failed processing item ${itemUrl}:`, itemErr.message);
        }
      }
    }

    // Set status to ready
    await exec(
      "UPDATE sources SET status = 'ready', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?",
      [sourceId]
    );
  } catch (err: any) {
    console.error(`[Sync] Failed to sync source ${sourceId}:`, err);
    await exec(
      "UPDATE sources SET status = 'error', error_message = ? WHERE id = ?",
      [err.message || 'Unknown sync error', sourceId]
    );
    throw err;
  }
}

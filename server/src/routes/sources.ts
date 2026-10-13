import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, exec } from '../db/duckdb.js';
import { syncSource, processAndIndexDocument } from '../services/rss.js';
import { scrapeUrl, parseContentOrHtml } from '../services/scraper.js';
import { decipherSourceType, decipherSourcesBatch } from '../services/decipher.js';
import { parseCsvSources, normalizeUrl } from '../../../shared/csv.js';
import type {
  Source,
  SourceType,
  AddSourceRequest,
  CsvImportResponse,
  CsvImportResultItem,
} from '../../../shared/types.js';

const router = Router();

// GET /api/sources
router.get('/', async (_req, res) => {
  try {
    const sources = await query<Source>(`
      SELECT 
        s.id,
        s.type,
        s.url,
        s.title,
        s.description,
        s.feed_url as "feedUrl",
        s.sync_interval_mins as "syncIntervalMins",
        s.last_synced_at as "lastSyncedAt",
        s.status,
        s.error_message as "errorMessage",
        s.created_at as "createdAt",
        COALESCE(d.doc_count, 0)::INTEGER as "docCount",
        COALESCE(d.chunk_count, 0)::INTEGER as "chunkCount"
      FROM sources s
      LEFT JOIN (
        SELECT 
          source_id,
          count(distinct doc.id) as doc_count,
          count(c.id) as chunk_count
        FROM documents doc
        LEFT JOIN chunks c ON c.document_id = doc.id
        GROUP BY source_id
      ) d ON d.source_id = s.id
      ORDER BY s.created_at DESC;
    `);

    res.json({ sources });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sources/decipher
router.post('/decipher', async (req, res) => {
  try {
    const { url, urls } = req.body;

    if (urls && Array.isArray(urls)) {
      const results = await decipherSourcesBatch(urls);
      return res.json({ results });
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url or urls required' });
    }

    const result = await decipherSourceType(url);
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sources/import-csv
router.post('/import-csv', async (req, res) => {
  try {
    const { csvContent, items: inputItems } = req.body;

    let itemsToProcess: Array<{
      url: string;
      title?: string;
      type?: SourceType | 'auto';
      syncIntervalMins?: number;
    }> = [];

    if (csvContent && typeof csvContent === 'string') {
      const parsed = parseCsvSources(csvContent);
      itemsToProcess = parsed.map((p) => ({
        url: p.url,
        title: p.title,
        type: p.type,
        syncIntervalMins: p.syncIntervalMins,
      }));
    } else if (inputItems && Array.isArray(inputItems)) {
      itemsToProcess = inputItems;
    }

    if (itemsToProcess.length === 0) {
      return res
        .status(400)
        .json({ error: 'No valid sources found to import. Please check your CSV format.' });
    }

    const results: CsvImportResultItem[] = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of itemsToProcess) {
      const cleanUrl = normalizeUrl(item.url || '');
      if (!cleanUrl) continue;

      try {
        new URL(cleanUrl);
      } catch {
        results.push({
          url: cleanUrl,
          title: item.title || cleanUrl,
          type: 'url',
          status: 'failed',
          message: 'Invalid URL format',
        });
        failed++;
        continue;
      }

      // Check if existing in DB
      const existing = await queryOne<Source>(
        'SELECT id, type, title FROM sources WHERE url = ?',
        [cleanUrl]
      );
      if (existing) {
        results.push({
          url: cleanUrl,
          title: existing.title || item.title || cleanUrl,
          type: existing.type,
          status: 'skipped',
          message: 'Source already exists in Knowledge Bank',
          sourceId: existing.id,
        });
        skipped++;
        continue;
      }

      // Automatically decipher whether it's RSS or URL if set to 'auto' or unspecified
      let resolvedType: SourceType = 'url';
      let resolvedTitle = item.title;

      if (!item.type || item.type === 'auto') {
        try {
          const deciphered = await decipherSourceType(cleanUrl);
          resolvedType = deciphered.type;
          if (!resolvedTitle && deciphered.title) {
            resolvedTitle = deciphered.title;
          }
        } catch {
          resolvedType = 'url';
        }
      } else {
        resolvedType = item.type;
      }

      const finalTitle = resolvedTitle?.trim() || cleanUrl;
      const id = uuidv4();

      if (resolvedType === 'rss') {
        try {
          await exec(
            `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
             VALUES (?, 'rss', ?, ?, ?, ?, 'syncing')`,
            [id, cleanUrl, finalTitle, cleanUrl, item.syncIntervalMins || 60]
          );

          // Asynchronously trigger RSS sync
          syncSource(id).catch((syncErr) => {
            console.error(`[CSV Import RSS Sync Error] ${id} (${cleanUrl}):`, syncErr.message);
          });

          results.push({
            url: cleanUrl,
            title: finalTitle,
            type: 'rss',
            status: 'imported',
            message: 'RSS feed registered and syncing articles',
            sourceId: id,
          });
          imported++;
        } catch (dbErr: any) {
          results.push({
            url: cleanUrl,
            title: finalTitle,
            type: 'rss',
            status: 'failed',
            message: `Database error: ${dbErr.message}`,
          });
          failed++;
        }
      } else {
        // Web Article URL
        try {
          const scraped = await scrapeUrl(cleanUrl);
          await exec(
            `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
             VALUES (?, 'url', ?, ?, NULL, 60, 'ready')`,
            [id, cleanUrl, scraped.title || finalTitle]
          );

          await processAndIndexDocument(id, cleanUrl, scraped);

          results.push({
            url: cleanUrl,
            title: scraped.title || finalTitle,
            type: 'url',
            status: 'imported',
            message: 'Web article scraped, chunked, and vector-indexed',
            sourceId: id,
          });
          imported++;
        } catch (scrapeErr: any) {
          console.warn(`[CSV Import Scrape Warning] ${cleanUrl}:`, scrapeErr.message);
          // Insert with status: 'error' so it appears in Knowledge Bank and user can input content manually
          try {
            await exec(
              `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status, error_message)
               VALUES (?, 'url', ?, ?, NULL, 60, 'error', ?)`,
              [id, cleanUrl, finalTitle, scrapeErr.message || 'Fetch failed']
            );

            results.push({
              url: cleanUrl,
              title: finalTitle,
              type: 'url',
              status: 'imported_with_error',
              message: `Saved with error: ${scrapeErr.message || 'Fetch failed'}. Content can be provided manually.`,
              sourceId: id,
            });
            imported++;
          } catch (dbErr: any) {
            results.push({
              url: cleanUrl,
              title: finalTitle,
              type: 'url',
              status: 'failed',
              message: `Failed to register source: ${dbErr.message}`,
            });
            failed++;
          }
        }
      }
    }

    const responsePayload: CsvImportResponse = {
      total: itemsToProcess.length,
      imported,
      skipped,
      failed,
      results,
    };

    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[CSV Import Route Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sources
router.post('/', async (req, res) => {
  try {
    const { type, url, title, syncIntervalMins = 60, rawContent } = req.body as AddSourceRequest;

    if (!url || !type) {
      return res.status(400).json({ error: 'url and type are required' });
    }

    const cleanUrl = normalizeUrl(url);
    let resolvedType = type;
    let resolvedTitle = title?.trim();

    // Auto-decipher if requested
    if (type === 'auto') {
      try {
        const deciphered = await decipherSourceType(cleanUrl);
        resolvedType = deciphered.type;
        if (!resolvedTitle && deciphered.title) {
          resolvedTitle = deciphered.title;
        }
      } catch {
        resolvedType = 'url';
      }
    }

    const sourceTitle = resolvedTitle || cleanUrl;

    // Check existing
    const existing = await queryOne<Source>('SELECT id FROM sources WHERE url = ?', [cleanUrl]);
    if (existing && !rawContent) {
      return res.status(409).json({ error: 'Source URL already registered', sourceId: existing.id });
    }

    // CASE 1: Manual content/HTML provided
    if (rawContent && rawContent.trim()) {
      const id = existing ? existing.id : uuidv4();
      const parsedArticle = parseContentOrHtml(rawContent, cleanUrl, sourceTitle);

      if (!existing) {
        await exec(
          `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
           VALUES (?, ?, ?, ?, ?, ?, 'ready')`,
          [id, resolvedType, cleanUrl, parsedArticle.title || sourceTitle, null, syncIntervalMins]
        );
      } else {
        await exec(
          `UPDATE sources SET title = ?, status = 'ready', error_message = NULL WHERE id = ?`,
          [parsedArticle.title || sourceTitle, id]
        );
      }

      await processAndIndexDocument(id, cleanUrl, parsedArticle);

      const source = await queryOne<Source>(
        `
        SELECT 
          id, type, url, title, description,
          feed_url as "feedUrl",
          sync_interval_mins as "syncIntervalMins",
          last_synced_at as "lastSyncedAt",
          status, error_message as "errorMessage",
          created_at as "createdAt"
        FROM sources WHERE id = ?
      `,
        [id]
      );

      return res
        .status(201)
        .json({ source, message: 'Source indexed successfully with manual content' });
    }

    // CASE 2: Single URL type without manual content - test scraping upfront
    if (resolvedType === 'url') {
      try {
        const scraped = await scrapeUrl(cleanUrl);
        const id = uuidv4();
        await exec(
          `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
           VALUES (?, ?, ?, ?, ?, ?, 'ready')`,
          [id, resolvedType, cleanUrl, scraped.title || sourceTitle, null, syncIntervalMins]
        );

        await processAndIndexDocument(id, cleanUrl, scraped);

        const newSource = await queryOne<Source>(
          `
          SELECT 
            id, type, url, title, description,
            feed_url as "feedUrl",
            sync_interval_mins as "syncIntervalMins",
            last_synced_at as "lastSyncedAt",
            status, error_message as "errorMessage",
            created_at as "createdAt"
          FROM sources WHERE id = ?
        `,
          [id]
        );

        return res.status(201).json({ source: newSource });
      } catch (fetchErr: any) {
        console.warn(`[Add Source] URL fetch failed for ${cleanUrl}:`, fetchErr.message);
        return res.status(422).json({
          error: fetchErr.message || 'Failed to fetch content from URL',
          fetchFailed: true,
          url: cleanUrl,
          suggestedTitle: sourceTitle,
        });
      }
    }

    // CASE 3: RSS Feed type
    const id = uuidv4();
    await exec(
      `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
       VALUES (?, ?, ?, ?, ?, ?, 'syncing')`,
      [id, resolvedType, cleanUrl, sourceTitle, cleanUrl, syncIntervalMins]
    );

    syncSource(id).catch((err) => {
      console.error(`[Source Async Sync Error] ${id}:`, err);
    });

    const newSource = await queryOne<Source>(
      `
      SELECT 
        id, type, url, title, description,
        feed_url as "feedUrl",
        sync_interval_mins as "syncIntervalMins",
        last_synced_at as "lastSyncedAt",
        status, error_message as "errorMessage",
        created_at as "createdAt"
      FROM sources WHERE id = ?
    `,
      [id]
    );
    res.status(201).json({ source: newSource });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sources/:id/manual-content
router.post('/:id/manual-content', async (req, res) => {
  try {
    const { id } = req.params;
    const { rawContent, title } = req.body;

    if (!rawContent || !rawContent.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const source = await queryOne<Source>('SELECT * FROM sources WHERE id = ?', [id]);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const parsedArticle = parseContentOrHtml(rawContent, source.url, title || source.title);
    await processAndIndexDocument(id, source.url, parsedArticle);

    await exec(
      `UPDATE sources SET title = ?, status = 'ready', error_message = NULL, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [parsedArticle.title || source.title, id]
    );

    const updatedSource = await queryOne<Source>(`
      SELECT 
        id, type, url, title, description,
        feed_url as "feedUrl",
        sync_interval_mins as "syncIntervalMins",
        last_synced_at as "lastSyncedAt",
        status, error_message as "errorMessage",
        created_at as "createdAt"
      FROM sources WHERE id = ?
    `, [id]);

    res.json({ source: updatedSource, message: 'Source updated with manual content' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sources/:id/sync
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const source = await queryOne('SELECT id FROM sources WHERE id = ?', [id]);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Trigger sync asynchronously
    syncSource(id).catch((err) => {
      console.error(`[Manual Sync Error] ${id}:`, err);
    });

    res.json({ message: 'Sync started', sourceId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sources/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete chunks associated with documents of this source
    await exec(
      'DELETE FROM chunks WHERE document_id IN (SELECT id FROM documents WHERE source_id = ?)',
      [id]
    );
    // Delete documents
    await exec('DELETE FROM documents WHERE source_id = ?', [id]);
    // Delete source
    await exec('DELETE FROM sources WHERE id = ?', [id]);

    res.json({ message: 'Source and associated documents deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

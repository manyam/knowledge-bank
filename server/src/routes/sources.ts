import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, exec } from '../db/duckdb.js';
import { syncSource } from '../services/rss.js';
import type { Source, AddSourceRequest } from '../../../shared/types.js';

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

// POST /api/sources
router.post('/', async (req, res) => {
  try {
    const { type, url, title, syncIntervalMins = 60 } = req.body as AddSourceRequest;

    if (!url || !type) {
      return res.status(400).json({ error: 'url and type are required' });
    }

    const cleanUrl = url.trim();

    // Check existing
    const existing = await queryOne<Source>('SELECT id FROM sources WHERE url = ?', [cleanUrl]);
    if (existing) {
      return res.status(409).json({ error: 'Source URL already registered', sourceId: existing.id });
    }

    const id = uuidv4();
    const sourceTitle = title?.trim() || cleanUrl;

    await exec(
      `INSERT INTO sources (id, type, url, title, feed_url, sync_interval_mins, status)
       VALUES (?, ?, ?, ?, ?, ?, 'syncing')`,
      [
        id,
        type,
        cleanUrl,
        sourceTitle,
        type === 'rss' ? cleanUrl : null,
        syncIntervalMins,
      ]
    );

    // Trigger sync asynchronously in background
    syncSource(id).catch((err) => {
      console.error(`[Source Async Sync Error] ${id}:`, err);
    });

    const newSource = await queryOne<Source>(`
      SELECT 
        id,
        type,
        url,
        title,
        description,
        feed_url as "feedUrl",
        sync_interval_mins as "syncIntervalMins",
        last_synced_at as "lastSyncedAt",
        status,
        error_message as "errorMessage",
        created_at as "createdAt"
      FROM sources WHERE id = ?
    `, [id]);
    res.status(201).json({ source: newSource });
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

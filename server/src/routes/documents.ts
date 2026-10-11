import { Router } from 'express';
import { query, queryOne, exec } from '../db/duckdb.js';
import type { Document, Chunk } from '../../../shared/types.js';

const router = Router();

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const { sourceId, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT 
        d.id,
        d.source_id as "sourceId",
        s.title as "sourceTitle",
        d.url,
        d.title,
        d.author,
        d.published_at as "publishedAt",
        d.content_hash as "contentHash",
        d.excerpt,
        d.chunk_count as "chunkCount",
        d.status,
        d.created_at as "createdAt"
      FROM documents d
      LEFT JOIN sources s ON s.id = d.source_id
    `;
    const params: any[] = [];

    if (sourceId) {
      sql += ' WHERE d.source_id = ?';
      params.push(sourceId);
    }

    sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const documents = await query<Document>(sql, params);
    res.json({ documents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await queryOne<Document>(
      `SELECT 
        d.id,
        d.source_id as "sourceId",
        s.title as "sourceTitle",
        d.url,
        d.title,
        d.author,
        d.published_at as "publishedAt",
        d.clean_text as "cleanText",
        d.excerpt,
        d.chunk_count as "chunkCount",
        d.status,
        d.created_at as "createdAt"
      FROM documents d
      LEFT JOIN sources s ON s.id = d.source_id
      WHERE d.id = ?`,
      [id]
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const chunks = await query<Chunk>(
      `SELECT 
        id,
        document_id as "documentId",
        chunk_index as "chunkIndex",
        content,
        token_count as "tokenCount",
        created_at as "createdAt"
      FROM chunks
      WHERE document_id = ?
      ORDER BY chunk_index ASC`,
      [id]
    );

    res.json({ document, chunks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await exec('DELETE FROM chunks WHERE document_id = ?', [id]);
    await exec('DELETE FROM documents WHERE id = ?', [id]);
    res.json({ message: 'Document deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

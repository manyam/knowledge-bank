import { Router } from 'express';
import fs from 'fs';
import { queryOne } from '../db/duckdb.js';
import { checkOllamaConnection, getActiveModels } from '../services/ollama.js';
import { config } from '../config.js';
import type { SystemStats } from '../../../shared/types.js';

const router = Router();

// GET /api/stats
router.get('/', async (_req, res) => {
  try {
    const sourcesCount = await queryOne<{ count: number }>(
      'SELECT count(*)::INTEGER as count FROM sources'
    );
    const docsCount = await queryOne<{ count: number }>(
      'SELECT count(*)::INTEGER as count FROM documents'
    );
    const chunksCount = await queryOne<{ count: number }>(
      'SELECT count(*)::INTEGER as count FROM chunks'
    );

    let dbSizeBytes = 0;
    try {
      if (fs.existsSync(config.duckdbPath)) {
        const stats = fs.statSync(config.duckdbPath);
        dbSizeBytes = stats.size;
      }
    } catch (e) {
      // ignore
    }

    const ollamaStatus = await checkOllamaConnection();
    const { embeddingModel, chatModel } = getActiveModels();

    const stats: SystemStats = {
      totalSources: sourcesCount?.count || 0,
      totalDocuments: docsCount?.count || 0,
      totalChunks: chunksCount?.count || 0,
      dbSizeBytes,
      ollamaConnected: ollamaStatus.connected,
      activeEmbeddingModel: embeddingModel,
      activeChatModel: chatModel,
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

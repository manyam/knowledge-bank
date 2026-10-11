import { Router } from 'express';
import { searchSimilarChunks } from '../services/rag.js';
import type { SearchRequest } from '../../../shared/types.js';

const router = Router();

// POST /api/search
router.post('/', async (req, res) => {
  try {
    const { query, topK = 5, minSimilarity = 0.25, sourceId } = req.body as SearchRequest;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchSimilarChunks(
      query,
      Number(topK),
      Number(minSimilarity),
      sourceId
    );

    res.json({ results, query });
  } catch (error: any) {
    console.error('[Search API Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to execute vector search' });
  }
});

export default router;

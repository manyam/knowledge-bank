import { Router } from 'express';
import { checkOllamaConnection, setActiveModels, getActiveModels } from '../services/ollama.js';

const router = Router();

// GET /api/models
router.get('/', async (_req, res) => {
  try {
    const status = await checkOllamaConnection();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/models/active
router.post('/active', async (req, res) => {
  try {
    const { embeddingModel, chatModel } = req.body;
    setActiveModels(embeddingModel, chatModel);
    const current = getActiveModels();
    res.json({ message: 'Active models updated', ...current });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router } from 'express';
import { translateAndRefineVoice } from '../services/voice.js';
import { getActiveModels } from '../services/ollama.js';

const router = Router();

// POST /api/voice/translate
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'English' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Audio transcript text is required' });
    }

    const result = await translateAndRefineVoice(text, targetLanguage);
    res.json(result);
  } catch (error: any) {
    console.error('[Voice API Error]:', error);
    res.status(500).json({ error: error.message || 'Voice translation failed' });
  }
});

// GET /api/voice/status
router.get('/status', (_req, res) => {
  const { chatModel } = getActiveModels();
  res.json({
    status: 'ready',
    activeModel: chatModel,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Any'],
  });
});

export default router;

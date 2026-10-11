import { Router } from 'express';
import { streamRagResponse } from '../services/rag.js';
import type { ChatRequest } from '../../../shared/types.js';

const router = Router();

// POST /api/chat (SSE streaming)
router.post('/', async (req, res) => {
  const { message, history = [], topK = 5, minSimilarity = 0.25 } = req.body as ChatRequest;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const generator = streamRagResponse(message, history, topK, minSimilarity);

    for await (const chunk of generator) {
      if (chunk.type === 'citations') {
        sendEvent('citations', chunk.data);
      } else if (chunk.type === 'token') {
        sendEvent('token', chunk.data);
      } else if (chunk.type === 'error') {
        sendEvent('error', chunk.data);
      } else if (chunk.type === 'done') {
        sendEvent('done', {});
      }
    }
  } catch (err: any) {
    sendEvent('error', err.message || 'Error occurred during streaming');
  } finally {
    res.end();
  }
});

export default router;

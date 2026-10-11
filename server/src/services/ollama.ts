import { config } from '../config.js';
import type { OllamaModel, OllamaStatus } from '../../../shared/types.js';

let activeEmbeddingModel = config.defaultEmbeddingModel;
let activeChatModel = config.defaultChatModel;

export function getActiveModels() {
  return {
    embeddingModel: activeEmbeddingModel,
    chatModel: activeChatModel,
  };
}

export function setActiveModels(embedding?: string, chat?: string) {
  if (embedding) activeEmbeddingModel = embedding;
  if (chat) activeChatModel = chat;
}

export async function checkOllamaConnection(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return {
        connected: false,
        activeEmbeddingModel,
        activeChatModel,
        models: [],
        error: `Ollama returned status ${res.status}`,
      };
    }

    const data = (await res.json()) as { models?: any[] };
    const rawModels = data.models || [];

    const models: OllamaModel[] = rawModels.map((m: any) => {
      const isEmbedding =
        m.name.includes('embed') ||
        m.name.includes('bge') ||
        m.name.includes('minilm') ||
        m.details?.family?.includes('bert');
      return {
        name: m.name,
        size: m.size,
        digest: m.digest,
        details: m.details,
        isEmbedding,
      };
    });

    return {
      connected: true,
      activeEmbeddingModel,
      activeChatModel,
      models,
    };
  } catch (err: any) {
    return {
      connected: false,
      activeEmbeddingModel,
      activeChatModel,
      models: [],
      error: err.message || 'Cannot connect to Ollama at ' + config.ollamaBaseUrl,
    };
  }
}

export async function generateEmbedding(
  text: string,
  modelName: string = activeEmbeddingModel
): Promise<number[]> {
  const cleanInput = text.trim();
  if (!cleanInput) {
    throw new Error('Cannot embed empty text');
  }

  // 1. Try modern Ollama /api/embed endpoint
  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        input: cleanInput,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { embeddings?: number[][] };
      if (data.embeddings && data.embeddings[0]) {
        return data.embeddings[0];
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  // 2. Fallback to /api/embeddings
  const res2 = await fetch(`${config.ollamaBaseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt: cleanInput,
    }),
  });

  if (!res2.ok) {
    const errorText = await res2.text();
    throw new Error(`Ollama embedding error (${res2.status}): ${errorText}`);
  }

  const data2 = (await res2.json()) as { embedding?: number[] };
  if (!data2.embedding) {
    throw new Error('Ollama returned empty embedding vector');
  }

  return data2.embedding;
}

export async function generateEmbeddingsBatch(
  texts: string[],
  modelName: string = activeEmbeddingModel,
  concurrency: number = 3
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const promises = batch.map((text, idx) =>
      generateEmbedding(text, modelName).then((vec) => {
        results[i + idx] = vec;
      })
    );
    await Promise.all(promises);
  }

  return results;
}

export async function* streamOllamaChat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelName: string = activeChatModel
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: true,
      options: {
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama chat error (${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error('Ollama chat returned empty response stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
          if (parsed.done) {
            return;
          }
        } catch (e) {
          // ignore partial json
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

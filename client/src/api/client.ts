import type {
  Source,
  Document,
  Chunk,
  SearchResult,
  OllamaStatus,
  SystemStats,
  AddSourceRequest,
} from '../../../shared/types.js';

const BASE_URL = '/api';

export async function fetchSources(): Promise<Source[]> {
  const res = await fetch(`${BASE_URL}/sources`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  const data = await res.json();
  return data.sources || [];
}

export async function addSource(payload: AddSourceRequest): Promise<Source> {
  const res = await fetch(`${BASE_URL}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add source');
  }
  const data = await res.json();
  return data.source;
}

export async function syncSource(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sources/${id}/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger sync');
}

export async function deleteSource(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sources/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete source');
}

export async function fetchDocuments(sourceId?: string): Promise<Document[]> {
  const url = sourceId
    ? `${BASE_URL}/documents?sourceId=${encodeURIComponent(sourceId)}`
    : `${BASE_URL}/documents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data = await res.json();
  return data.documents || [];
}

export async function fetchDocumentDetail(id: string): Promise<{ document: Document; chunks: Chunk[] }> {
  const res = await fetch(`${BASE_URL}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document detail');
  return await res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function searchKnowledge(
  query: string,
  topK = 5,
  minSimilarity = 0.25,
  sourceId?: string
): Promise<SearchResult[]> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK, minSimilarity, sourceId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Vector search failed');
  }
  const data = await res.json();
  return data.results || [];
}

export async function fetchModels(): Promise<OllamaStatus> {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error('Failed to fetch Ollama status');
  return await res.json();
}

export async function updateActiveModels(embeddingModel?: string, chatModel?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/models/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeddingModel, chatModel }),
  });
  if (!res.ok) throw new Error('Failed to update models');
}

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${BASE_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return await res.json();
}

export async function streamChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    topK?: number;
    minSimilarity?: number;
    onCitations?: (citations: SearchResult[]) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      topK: options.topK ?? 5,
      minSimilarity: options.minSimilarity ?? 0.25,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    options.onError?.(`Chat error: ${errText}`);
    return;
  }

  if (!res.body) {
    options.onError?.('Empty response stream');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        try {
          const parsed = JSON.parse(eventData);
          if (eventType === 'citations') {
            options.onCitations?.(parsed);
          } else if (eventType === 'token') {
            options.onToken?.(parsed);
          } else if (eventType === 'done') {
            options.onDone?.();
          } else if (eventType === 'error') {
            options.onError?.(parsed);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    options.onDone?.();
  } catch (err: any) {
    options.onError?.(err.message || 'Stream read error');
  } finally {
    reader.releaseLock();
  }
}

export async function translateVoiceQuery(
  text: string,
  targetLanguage: string = 'English'
): Promise<{ originalText: string; refinedText: string; model: string }> {
  const res = await fetch(`${BASE_URL}/voice/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Voice translation failed');
  }
  return await res.json();
}

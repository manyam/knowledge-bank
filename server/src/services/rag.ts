import { query, queryOne } from '../db/duckdb.js';
import { generateEmbedding, streamOllamaChat, getActiveModels } from './ollama.js';
import { config } from '../config.js';
import type { SearchResult } from '../../../shared/types.js';

export async function searchSimilarChunks(
  userQuery: string,
  topK: number = config.defaultTopK,
  minSimilarity: number = config.defaultMinSimilarity,
  sourceId?: string
): Promise<SearchResult[]> {
  const cleanQuery = userQuery.trim();
  if (!cleanQuery) return [];

  // Check if we have any chunks stored
  const countRow = await queryOne<{ count: number }>(
    'SELECT count(*)::INTEGER as count FROM chunks WHERE embedding IS NOT NULL'
  );
  if (!countRow || countRow.count === 0) {
    return [];
  }

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(cleanQuery);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error('Failed to generate embedding for search query');
  }

  // 2. Format query vector literal for DuckDB
  const vectorLiteral = `[${queryEmbedding.map((v) => (Number.isFinite(v) ? v : 0)).join(',')}]::FLOAT[]`;

  // 3. Build DuckDB query
  let sourceFilterClause = '';
  const params: any[] = [];

  if (sourceId) {
    sourceFilterClause = `AND d.source_id = ?`;
    params.push(sourceId);
  }

  const sql = `
    SELECT 
      c.id AS "chunkId",
      c.document_id AS "documentId",
      c.content,
      c.chunk_index AS "chunkIndex",
      d.title AS "documentTitle",
      d.url AS "documentUrl",
      d.author,
      d.published_at AS "publishedAt",
      list_cosine_similarity(c.embedding, ${vectorLiteral}) AS similarity
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
      ${sourceFilterClause}
      AND list_cosine_similarity(c.embedding, ${vectorLiteral}) >= ${Number(minSimilarity) || 0}
    ORDER BY similarity DESC
    LIMIT ${Math.max(1, Math.min(topK, 50))};
  `;

  const rows = await query<SearchResult>(sql, params);
  return rows.map((r) => ({
    ...r,
    similarity: Number((r.similarity || 0).toFixed(4)),
  }));
}

export function formatRagContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant sources found in the knowledge bank.';
  }

  return results
    .map(
      (res, idx) =>
        `[Source ${idx + 1}] "${res.documentTitle}" (${res.documentUrl})\n${res.content}`
    )
    .join('\n\n---\n\n');
}

export async function* streamRagResponse(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  topK: number = config.defaultTopK,
  minSimilarity: number = config.defaultMinSimilarity
): AsyncGenerator<{ type: 'citations' | 'token' | 'done' | 'error'; data: any }, void, unknown> {
  try {
    // 1. Retrieve relevant chunks
    const citations = await searchSimilarChunks(message, topK, minSimilarity);
    yield { type: 'citations', data: citations };

    // 2. Prepare context prompt
    const contextText = formatRagContext(citations);

    const systemPrompt = `You are KnowledgeBank Assistant, an AI assistant dedicated to answering questions accurately using the user's personal knowledge base.

Here are the retrieved relevant excerpts from the knowledge bank:
<context>
${contextText}
</context>

Instructions:
- Base your answers primarily on the provided context excerpts above.
- When referencing information from a source, cite it clearly using bracket notation like [Source 1], [Source 2], etc.
- If the context doesn't contain enough information to answer the question, state honestly that the knowledge bank does not have enough information on that topic, but you may provide a brief helpful general response if appropriate.
- Be concise, objective, and well-structured using markdown.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-6), // last 6 turns
      { role: 'user' as const, content: message },
    ];

    const { chatModel } = getActiveModels();

    for await (const token of streamOllamaChat(messages, chatModel)) {
      yield { type: 'token', data: token };
    }

    yield { type: 'done', data: null };
  } catch (err: any) {
    yield { type: 'error', data: err.message || 'An error occurred during RAG generation' };
  }
}

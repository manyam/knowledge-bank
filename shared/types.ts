export type SourceType = 'url' | 'rss';
export type SourceStatus = 'idle' | 'syncing' | 'ready' | 'error';
export type DocumentStatus = 'pending' | 'chunked' | 'indexed' | 'failed';

export interface Source {
  id: string;
  type: SourceType;
  url: string;
  title: string;
  description?: string;
  feedUrl?: string;
  syncIntervalMins: number;
  lastSyncedAt?: string;
  status: SourceStatus;
  errorMessage?: string;
  docCount?: number;
  chunkCount?: number;
  createdAt: string;
}

export interface Document {
  id: string;
  sourceId: string;
  sourceTitle?: string;
  url: string;
  title: string;
  author?: string;
  publishedAt?: string;
  contentHash: string;
  cleanText: string;
  excerpt?: string;
  chunkCount: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  documentTitle?: string;
  documentUrl?: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  similarity?: number;
  createdAt: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentUrl: string;
  author?: string;
  publishedAt?: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: SearchResult[];
  isStreaming?: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest?: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
  isEmbedding?: boolean;
}

export interface OllamaStatus {
  connected: boolean;
  version?: string;
  activeEmbeddingModel: string;
  activeChatModel: string;
  models: OllamaModel[];
  error?: string;
}

export interface SystemStats {
  totalSources: number;
  totalDocuments: number;
  totalChunks: number;
  dbSizeBytes: number;
  ollamaConnected: boolean;
  activeEmbeddingModel: string;
  activeChatModel: string;
}

export interface AddSourceRequest {
  type: SourceType;
  url: string;
  title?: string;
  syncIntervalMins?: number;
}

export interface SearchRequest {
  query: string;
  topK?: number;
  minSimilarity?: number;
  sourceId?: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  topK?: number;
  minSimilarity?: number;
}

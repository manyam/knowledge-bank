import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root data directory for DuckDB
const projectRoot = path.resolve(__dirname, '../../');
const dataDir = path.resolve(projectRoot, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '127.0.0.1',
  duckdbPath: process.env.DUCKDB_PATH || path.join(dataDir, 'knowledge_bank.duckdb'),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  defaultEmbeddingModel: process.env.DEFAULT_EMBEDDING_MODEL || 'nomic-embed-text',
  defaultChatModel: process.env.DEFAULT_CHAT_MODEL || 'gemma4:26b-mlx',
  chunkSize: parseInt(process.env.CHUNK_SIZE || '1500', 10), // characters
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '250', 10),
  defaultTopK: parseInt(process.env.DEFAULT_TOP_K || '5', 10),
  defaultMinSimilarity: parseFloat(process.env.DEFAULT_MIN_SIMILARITY || '0.3'),
  projectRoot,
  dataDir,
};

export const INIT_SCHEMA_SQL = `
-- 1. Sources: URLs and RSS Feeds
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR PRIMARY KEY,
    type VARCHAR NOT NULL,               -- 'url' | 'rss'
    url VARCHAR NOT NULL UNIQUE,
    title VARCHAR,
    description TEXT,
    feed_url VARCHAR,
    sync_interval_mins INTEGER DEFAULT 60,
    last_synced_at TIMESTAMP,
    status VARCHAR DEFAULT 'idle',       -- 'idle' | 'syncing' | 'ready' | 'error'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ingested Documents / Articles
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR PRIMARY KEY,
    source_id VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    author VARCHAR,
    published_at TIMESTAMP,
    content_hash VARCHAR NOT NULL,
    clean_text TEXT NOT NULL,
    excerpt TEXT,
    chunk_count INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'pending',    -- 'pending' | 'chunked' | 'indexed' | 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks & Vector Store
CREATE TABLE IF NOT EXISTS chunks (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding FLOAT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_docs_source ON documents(source_id);
CREATE INDEX IF NOT EXISTS idx_docs_url ON documents(url);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id);
`;

// Global polyfill for BigInt JSON serialization
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDatabase, query } from './db/duckdb.js';
import { syncSource } from './services/rss.js';

import sourcesRouter from './routes/sources.js';
import documentsRouter from './routes/documents.js';
import searchRouter from './routes/search.js';
import chatRouter from './routes/chat.js';
import modelsRouter from './routes/models.js';
import statsRouter from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// API routes
app.use('/api/sources', sourcesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/search', searchRouter);
app.use('/api/chat', chatRouter);
app.use('/api/models', modelsRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static assets if built
const clientDist = path.resolve(__dirname, '../../dist/client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Background scheduler for RSS feeds
function setupPeriodicSync() {
  const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes

  setInterval(async () => {
    try {
      // Find RSS sources that are ready or idle and haven't synced in sync_interval_mins
      const dueSources = await query<{ id: string; url: string }>(`
        SELECT id, url FROM sources
        WHERE type = 'rss'
          AND status != 'syncing'
          AND (
            last_synced_at IS NULL 
            OR last_synced_at < (CURRENT_TIMESTAMP - (sync_interval_mins || ' minutes')::INTERVAL)
          )
        LIMIT 5
      `);

      for (const src of dueSources) {
        console.log(`[Scheduler] Auto-syncing RSS feed: ${src.url}`);
        syncSource(src.id).catch((err) => {
          console.error(`[Scheduler] Error auto-syncing ${src.id}:`, err);
        });
      }
    } catch (err) {
      console.error('[Scheduler] Error in periodic sync job:', err);
    }
  }, CHECK_INTERVAL_MS);
}

async function startServer() {
  try {
    // 1. Initialize DuckDB schema
    await initDatabase();

    // 2. Setup periodic background RSS sync
    setupPeriodicSync();

    // 3. Start listening
    app.listen(config.port, config.host, () => {
      console.log(`\n=================================================`);
      console.log(`🚀 Knowledge Bank Server running at: http://${config.host}:${config.port}`);
      console.log(`📦 DuckDB Path: ${config.duckdbPath}`);
      console.log(`🦙 Ollama URL:  ${config.ollamaBaseUrl}`);
      console.log(`=================================================\n`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();

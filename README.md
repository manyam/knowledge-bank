# 🧠 Knowledge Bank

> A private, local-first Knowledge Bank built with **React 19**, **TypeScript**, embedded **DuckDB** vector store, and local **Ollama** models for fast semantic search and conversational RAG.

---

## 🌟 Key Features

- **Embedded DuckDB Vector Store**:
  - Uses DuckDB's native `FLOAT[]` vector representation and high-performance `list_cosine_similarity` analytical queries.
  - Zero cloud dependencies, zero external database setup—everything lives in `./data/knowledge_bank.duckdb`.
- **Intelligent Ingestion Engine**:
  - **URL Scraper**: Uses `@mozilla/readability` and `jsdom` (Firefox Reader Mode engine) to strip web clutter (ads, sidebars, navigation) into clean text.
  - **RSS / Atom Feeds**: Automatically polls feeds (e.g. Hacker News, Substack, ArXiv, TechCrunch) and indexes new articles.
  - **Sliding-Window Chunker**: Splits text with sentence-boundary awareness and configurable overlap (~1500 chars / 250 overlap).
  - **Deduplication**: SHA-256 content hashing prevents redundant scraping or re-embedding.
- **Local Ollama AI Integration**:
  - Automatically discovers installed Ollama models (`nomic-embed-text`, `mxbai-embed-large`, `gemma4:26b-mlx`, `llama3.2`, `mistral`, `qwen2.5`, etc.).
  - Real-time connection health checks and custom model selector.
- **Fast Semantic Search**:
  - Real-time vector search with configurable **Top-K** and **Minimum Similarity** threshold sliders.
  - Filter by specific knowledge sources or search across the entire library.
- **Conversational RAG Assistant**:
  - Multi-turn chat assistant grounded strictly in your saved articles.
  - Real-time token streaming via Server-Sent Events (SSE).
  - Expandable citation cards with direct links and chunk previews.
- **Document Library & Reader Mode**:
  - Clean article reading view with metadata (author, publication date, source).
  - Low-level vector chunk inspector with token counts and chunk indexing.

---

## 🏗️ Architecture

```
knowledge-bank/
├── client/                    # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/client.ts      # Type-safe API client & SSE streaming reader
│   │   ├── components/        # UI components (Navbar, Sidebar, Modals)
│   │   │   ├── chat/          # RAG ChatInterface & CitationCard
│   │   │   ├── documents/     # DocumentLibrary & filters
│   │   │   ├── search/        # SemanticSearch & SearchResultCard
│   │   │   └── sources/       # SourceList, AddSourceModal, DocumentReader
│   │   └── App.tsx            # Main application layout
├── server/                    # Node.js + TypeScript + Express backend
│   └── src/
│       ├── db/
│       │   ├── duckdb.ts      # @duckdb/node-api client & vector similarity queries
│       │   └── schema.ts      # DDL schemas for sources, documents, and chunks
│       ├── services/
│       │   ├── scraper.ts     # Mozilla Readability + JSDOM web extractor
│       │   ├── rss.ts         # RSS parser & background sync worker
│       │   ├── chunker.ts     # Sliding window text chunking
│       │   ├── ollama.ts      # Ollama embedding & chat streaming client
│       │   └── rag.ts         # Top-K vector retrieval & prompt assembly
│       └── routes/            # REST API & SSE streaming endpoints
├── shared/
│   └── types.ts               # Shared TypeScript models (Source, Document, Chunk, etc.)
└── data/
    └── knowledge_bank.duckdb  # Local embedded DuckDB database file
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites

- **Node.js**: v20+ (tested on Node 20, 22, and 26)
- **Ollama**: Installed and running locally ([Download Ollama](https://ollama.ai))

Pull recommended local models for embeddings and chat:

```bash
# Recommended 768-dim embedding model
ollama pull nomic-embed-text

# Recommended chat LLM
ollama pull gemma4:26b-mlx
```

### 2. Installation

```bash
# Clone or navigate to the workspace
cd knowledge-bank

# Dependencies are already installed, or run:
npm install
```

### 3. Start Development Server

Run both the Vite frontend and the Express backend concurrently:

```bash
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 💡 How to Use

1. **Add Sources**:
   - Open the **Sources & Feeds** tab.
   - Click **Add Source** and paste any webpage URL or RSS/Atom feed URL (e.g. `https://news.ycombinator.com/rss`).
   - The engine automatically parses the feed, strips HTML clutter, chunks the text, and stores vector embeddings in DuckDB.
2. **Perform Semantic Vector Search**:
   - Navigate to **Semantic Search**.
   - Type any conceptual question or phrase (e.g., *"vector database benchmarks"* or *"large language model updates"*).
   - Adjust the **Top-K** and **Min Similarity** sliders to inspect matching chunks with similarity percentages.
3. **Chat with Your Knowledge Base (RAG)**:
   - Go to **RAG Assistant**.
   - Ask questions about your saved articles. The assistant retrieves relevant passages from DuckDB, includes clickable citations, and streams the answer using your local Ollama LLM.
4. **Inspect Documents**:
   - Click **Document Library** or **Browse** on any source to read the clean article text and view all generated vector chunks.

---

## 🔒 Privacy & Local Execution

- All web content, embeddings, and chat interactions remain **100% on your local machine**.
- The DuckDB database resides in `./data/knowledge_bank.duckdb`.
- No third-party API keys or cloud vector databases are required.

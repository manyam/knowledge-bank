# 🧠 Knowledge Bank: Embedded DuckDB Vector Store & Local Multi-Modal RAG

## 📌 Summary of Changes

This PR implements **Knowledge Bank**, a local-first research and knowledge retrieval system built with **React 19**, **TypeScript**, embedded **DuckDB** vector store, and local **Ollama** models.

---

### 🌟 Key Features

1. **Embedded DuckDB Vector Store (`@duckdb/node-api`)**:
   - Columnar `FLOAT[]` vector representation and high-performance `list_cosine_similarity()` queries.
   - Zero cloud dependencies—in-process embedded storage directly in `./data/knowledge_bank.duckdb`.
   - Resolved Node.js `BigInt` / Timestamp serialization issues for JSON REST APIs.

2. **CSV Batch Import & Intelligent URL / RSS Deciphering**:
   - Batch import dozens of URLs at once via file upload (`.csv`, `.txt`) or direct copy-paste.
   - Interactive preview table with editable titles, row-by-row selection, and auto-detected types.
   - Intelligent detection pipeline: probes with `rss-parser`, inspects MIME headers & HTML/XML tags, and falls back to URL heuristics.
   - One-click sample CSV template download.

3. **Intelligent Ingestion Engine & Mozilla Readability**:
   - Article scraping with `@mozilla/readability` and `jsdom` (Firefox Reader Mode engine) to strip ads, navigation, and boilerplate.
   - **Automatic Fallback Modal**: When a URL fetch fails (due to paywalls, 403s, or bot protection), automatically prompts the user to paste article text or HTML directly for instant indexing.
   - Sliding-window text chunker (~1500 chars / 250 overlap) with sentence-boundary awareness and SHA-256 deduplication.

4. **Multi-Modal Research Assistant (Live Voice STT & TTS)**:
   - **Live Voice Input**: Real-time microphone capture with animated sound waves and Web Speech API recognition.
   - **Local Model Translation & Speech Refinement**: Routes spoken transcripts through the local LLM (`gemma4:26b-mlx`) to translate multi-lingual speech into English, remove filler words (*"um"*, *"uh"*, *"like"*), and structure queries.
   - **Streaming RAG Chat**: Real-time token streaming via Server-Sent Events (SSE) grounded strictly in saved articles.
   - **Text-to-Speech (TTS)**: One-click audio playback of assistant answers with speech normalization to strip markdown syntax and citation tags.
   - **Clean Typography Rendering**: Formats assistant output into clean prose, typography, and interactive citation badges.

5. **Semantic Vector Search & Document Library**:
   - Real-time vector search with configurable **Top-K** and **Minimum Similarity** threshold sliders.
   - Filter search by specific knowledge sources or search across the entire library.
   - Document reader modal with metadata inspector and low-level chunk vector viewer.

---

## 🤖 Models Used

| Role | Model | Specifications |
| :--- | :--- | :--- |
| **Vector Embeddings** | **`nomic-embed-text`** | 768 dimensions, 8192 context window |
| **Reasoning & Audio Translation** | **`gemma4:26b-mlx`** | 26B parameters, optimized for Apple Silicon (MLX) |

---

## 🧪 Verification & Testing

- [x] Full build passes cleanly: `npm run build` (`tsc -p server/tsconfig.json` & `vite build`).
- [x] Tested CSV parser with commas, tabs, semicolons, quotes, and headerless inputs.
- [x] Tested RSS vs. URL deciphering pipeline across feeds and regular web pages.
- [x] Verified DuckDB BigInt serialization and timestamp handling.
- [x] Tested voice speech recognition and audio refinement pipeline.

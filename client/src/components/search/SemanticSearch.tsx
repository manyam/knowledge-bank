import React, { useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { searchKnowledge } from '../../api/client.js';
import { SearchResultCard } from './SearchResultCard.js';
import type { SearchResult, Source } from '../../../../shared/types.js';

interface SemanticSearchProps {
  sources: Source[];
  onOpenDocument: (documentId: string) => void;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({ sources, onOpenDocument }) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(6);
  const [minSimilarity, setMinSimilarity] = useState(0.2);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const sampleQueries = [
    'Vector similarity search algorithms',
    'Local LLM model performance',
    'DuckDB analytical query processing',
    'Recent tech news and announcements',
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    const start = performance.now();

    try {
      const data = await searchKnowledge(
        searchQuery.trim(),
        topK,
        minSimilarity,
        selectedSourceId || undefined
      );
      setResults(data);
      setHasSearched(true);
      setSearchTimeMs(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Fast Semantic Vector Search</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Queries are converted to embeddings via Ollama and matched using DuckDB's native vector cosine similarity.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search your knowledge base by concept, topic, or question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-32 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xl transition-all"
          />

          <div className="absolute right-3 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-colors ${
                showFilters
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Search Filters & Parameters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Search</span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-150">
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1.5">
                <span>Top Results (Top-K)</span>
                <span className="text-sky-400 font-bold">{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1.5">
                <span>Min Similarity Threshold</span>
                <span className="text-sky-400 font-bold">{(minSimilarity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.05"
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Filter by Source</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || s.url}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>

      {/* Suggested Queries */}
      {!hasSearched && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Try an Example Query</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  handleSearch(sample);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-200">{results.length} vector chunks</span>
            <span>matched your query</span>
          </div>
          {searchTimeMs !== null && (
            <div className="flex items-center space-x-1 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>DuckDB search: {searchTimeMs}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      {hasSearched && results.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No matching vectors found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try lowering the Min Similarity threshold in the filter panel, or indexing more documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((res) => (
            <SearchResultCard key={res.chunkId} result={res} onOpenDocument={onOpenDocument} />
          ))}
        </div>
      )}
    </div>
  );
};

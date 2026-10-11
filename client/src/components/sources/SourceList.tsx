import React, { useState } from 'react';
import {
  Globe,
  Rss,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plus,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import type { Source, SourceType } from '../../../../shared/types.js';

interface SourceListProps {
  sources: Source[];
  onAddClick: () => void;
  onSync: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewDocuments: (sourceId: string) => void;
  isSyncingId: string | null;
}

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  onAddClick,
  onSync,
  onDelete,
  onViewDocuments,
  isSyncingId,
}) => {
  const [filterType, setFilterType] = useState<'all' | SourceType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSources = sources.filter((s) => {
    if (filterType === 'all') return true;
    return s.type === filterType;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this source and all its documents and vectors?')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Knowledge Sources & Feeds</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage web articles and automated RSS feeds indexed in DuckDB.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterType === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({sources.length})
            </button>
            <button
              onClick={() => setFilterType('url')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterType === 'url'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              URLs ({sources.filter((s) => s.type === 'url').length})
            </button>
            <button
              onClick={() => setFilterType('rss')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterType === 'rss'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feeds ({sources.filter((s) => s.type === 'rss').length})
            </button>
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      {filteredSources.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No sources registered yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Add a web page URL or an RSS feed to start indexing articles and documents into your local DuckDB vector store.
          </p>
          <button
            onClick={onAddClick}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Source</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => {
            const isSyncing = isSyncingId === source.id || source.status === 'syncing';
            const isRss = source.type === 'rss';

            return (
              <div
                key={source.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${
                        isRss
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {isRss ? <Rss className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      <span>{isRss ? 'RSS Feed' : 'Web URL'}</span>
                    </span>

                    {/* Status indicator */}
                    <div className="flex items-center space-x-1.5 text-xs">
                      {isSyncing ? (
                        <span className="flex items-center space-x-1 text-sky-400 text-[11px] font-medium animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      ) : source.status === 'error' ? (
                        <span
                          className="flex items-center space-x-1 text-rose-400 text-[11px] font-medium"
                          title={source.errorMessage}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & URL */}
                  <h3 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-sky-300 transition-colors">
                    {source.title || source.url}
                  </h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-400 flex items-center space-x-1 truncate max-w-full mb-3"
                  >
                    <span className="truncate">{source.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>

                  {source.errorMessage && (
                    <div className="p-2 mb-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300 line-clamp-2">
                      {source.errorMessage}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs mb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none">Articles</span>
                        <span className="font-semibold text-slate-200">
                          {source.docCount || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-none">Chunks</span>
                        <span className="font-semibold text-slate-200">
                          {source.chunkCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>
                      {source.lastSyncedAt
                        ? new Date(source.lastSyncedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never synced'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onViewDocuments(source.id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors text-[11px] font-medium"
                    >
                      Browse
                    </button>
                    <button
                      onClick={() => onSync(source.id)}
                      disabled={isSyncing}
                      title="Sync and re-index now"
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      disabled={deletingId === source.id}
                      title="Delete source"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

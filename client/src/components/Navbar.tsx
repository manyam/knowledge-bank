import React from 'react';
import { Database, Cpu, HardDrive, RefreshCw, Layers } from 'lucide-react';
import type { SystemStats, OllamaStatus } from '../../../shared/types.js';

interface NavbarProps {
  stats: SystemStats | null;
  ollamaStatus: OllamaStatus | null;
  onOpenOllamaModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  ollamaStatus,
  onOpenOllamaModal,
  onRefresh,
  isRefreshing,
}) => {
  const isOllamaConnected = ollamaStatus?.connected ?? false;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">Knowledge Bank</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
              DuckDB + RAG
            </span>
          </div>
          <p className="text-xs text-slate-400">Local Vector Store & RSS Feed Engine</p>
        </div>
      </div>

      {/* Middle Stats */}
      {stats && (
        <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>
              <strong className="text-slate-200">{stats.totalSources}</strong> sources
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-2">
            <span>
              <strong className="text-slate-200">{stats.totalDocuments}</strong> documents
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-2">
            <span>
              <strong className="text-slate-200">{stats.totalChunks}</strong> chunks
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <strong className="text-slate-200">
                {(stats.dbSizeBytes / (1024 * 1024)).toFixed(2)} MB
              </strong>{' '}
              DuckDB
            </span>
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>

        {/* Ollama Status Button */}
        <button
          onClick={onOpenOllamaModal}
          className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            isOllamaConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOllamaConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isOllamaConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <Cpu className="w-3.5 h-3.5" />
          <div className="flex items-center space-x-1.5">
            <span>{isOllamaConnected ? 'Ollama Online' : 'Ollama Offline'}</span>
            {isOllamaConnected && ollamaStatus?.activeChatModel && (
              <span className="text-slate-400 hidden sm:inline">
                ({ollamaStatus.activeChatModel})
              </span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
};

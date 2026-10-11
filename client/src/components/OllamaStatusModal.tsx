import React, { useState } from 'react';
import { X, Cpu, CheckCircle2, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react';
import type { OllamaStatus } from '../../../shared/types.js';

interface OllamaStatusModalProps {
  status: OllamaStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveModels: (embedding: string, chat: string) => Promise<void>;
  onRefresh: () => void;
}

export const OllamaStatusModal: React.FC<OllamaStatusModalProps> = ({
  status,
  isOpen,
  onClose,
  onSaveModels,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const [selectedEmbedding, setSelectedEmbedding] = useState(
    status?.activeEmbeddingModel || 'nomic-embed-text'
  );
  const [selectedChat, setSelectedChat] = useState(status?.activeChatModel || 'llama3.2');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const models = status?.models || [];
  const isConnected = status?.connected ?? false;

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveModels(selectedEmbedding, selectedChat);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Local Ollama Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Alert */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-sm">
                {isConnected ? 'Ollama is Running' : 'Ollama is Not Responding'}
              </div>
              <p className="text-slate-400">
                {isConnected
                  ? `Connected to http://127.0.0.1:11434 with ${models.length} local models detected.`
                  : 'Start Ollama on your machine (`ollama serve`). Ensure models are pulled locally.'}
              </p>
            </div>
          </div>

          {/* Model Pickers */}
          {isConnected && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Vector Embedding Model
                </label>
                <select
                  value={selectedEmbedding}
                  onChange={(e) => setSelectedEmbedding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.isEmbedding ? '⭐ (Recommended for Embeddings)' : ''}
                    </option>
                  ))}
                  {!models.some((m) => m.name === selectedEmbedding) && (
                    <option value={selectedEmbedding}>{selectedEmbedding} (Custom)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used by DuckDB to index article content and user search queries.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chat Reasoning LLM
                </label>
                <select
                  value={selectedChat}
                  onChange={(e) => setSelectedChat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  {!models.some((m) => m.name === selectedChat) && (
                    <option value={selectedChat}>{selectedChat} (Custom)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used by RAG to synthesize responses with citations.
                </p>
              </div>
            </div>
          )}

          {/* Pull Commands Helper */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recommended Local Models
            </span>

            {[
              { label: 'Embedding Model', cmd: 'ollama pull nomic-embed-text' },
              { label: 'Chat LLM', cmd: 'ollama pull llama3.2' },
            ].map(({ label, cmd }) => (
              <div
                key={cmd}
                className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs"
              >
                <div>
                  <span className="text-slate-400 block text-[10px]">{label}</span>
                  <code className="text-sky-300 font-mono">{cmd}</code>
                </div>
                <button
                  onClick={() => handleCopy(cmd)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="Copy command"
                >
                  {copiedCmd === cmd ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-check Connection</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Apply Models'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

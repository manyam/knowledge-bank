import React, { useState, useEffect } from 'react';
import { X, ExternalLink, BookOpen, Layers, Calendar, User, Trash2 } from 'lucide-react';
import { fetchDocumentDetail } from '../../api/client.js';
import type { Document, Chunk } from '../../../../shared/types.js';

interface DocumentReaderModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteDocument?: (id: string) => Promise<void>;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onDeleteDocument,
}) => {
  if (!isOpen || !documentId) return null;

  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reader' | 'chunks'>('reader');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDocumentDetail(documentId)
      .then((data) => {
        if (isMounted) {
          setDocument(data.document);
          setChunks(data.chunks || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load document details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between bg-slate-900/90">
          <div className="space-y-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-white truncate">
              {document?.title || 'Loading Article...'}
            </h2>
            {document?.url && (
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1 truncate"
              >
                <span className="truncate">{document.url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onDeleteDocument && (
              <button
                onClick={async () => {
                  if (confirm('Delete this document and all its chunks?')) {
                    await onDeleteDocument(documentId);
                    onClose();
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata Strip & Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            {document?.author && (
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{document.author}</span>
              </span>
            )}
            {document?.publishedAt && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(document.publishedAt).toLocaleDateString()}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{chunks.length} DuckDB Chunks</span>
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('reader')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'reader'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Clean Text</span>
            </button>
            <button
              onClick={() => setActiveTab('chunks')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'chunks'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Chunks ({chunks.length})</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading document from DuckDB...</span>
            </div>
          ) : activeTab === 'reader' ? (
            <div className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-300">
              {document?.cleanText || 'No text extracted.'}
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-800/80">
                    <span className="font-semibold text-indigo-400">
                      Chunk #{chunk.chunkIndex + 1}
                    </span>
                    <div className="flex items-center space-x-3 text-[11px]">
                      <span>~{chunk.tokenCount || 0} tokens</span>
                      <span>{chunk.content.length} chars</span>
                    </div>
                  </div>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

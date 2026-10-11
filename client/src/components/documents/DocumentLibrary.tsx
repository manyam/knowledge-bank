import React, { useState } from 'react';
import { BookOpen, ExternalLink, Trash2, Calendar, User, Search, Layers } from 'lucide-react';
import type { Document, Source } from '../../../../shared/types.js';

interface DocumentLibraryProps {
  documents: Document[];
  sources: Source[];
  selectedSourceId: string | null;
  onSelectSourceId: (id: string | null) => void;
  onOpenDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  sources,
  selectedSourceId,
  onSelectSourceId,
  onOpenDocument,
  onDeleteDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    if (selectedSourceId && doc.sourceId !== selectedSourceId) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        doc.title.toLowerCase().includes(term) ||
        (doc.excerpt && doc.excerpt.toLowerCase().includes(term)) ||
        doc.url.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Delete this document and all its indexed chunks?')) {
      setDeletingId(id);
      try {
        await onDeleteDocument(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Document Library</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {documents.length} extracted articles and web pages indexed in DuckDB.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Source Filter */}
          <select
            value={selectedSourceId || ''}
            onChange={(e) => onSelectSourceId(e.target.value || null)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title || s.url}
              </option>
            ))}
          </select>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter titles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredDocs.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No documents found</h4>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || selectedSourceId
              ? 'Try adjusting your search query or filter.'
              : 'Add knowledge sources to start indexing articles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="font-medium text-slate-400 truncate max-w-[65%]">
                    {doc.sourceTitle || 'Web Page'}
                  </span>
                  <span className="flex items-center space-x-1 shrink-0 text-indigo-400 font-semibold">
                    <Layers className="w-3 h-3" />
                    <span>{doc.chunkCount} chunks</span>
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-sky-300 transition-colors">
                  {doc.title}
                </h3>

                {doc.excerpt && (
                  <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
                    {doc.excerpt}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-2 text-[11px]">
                  {doc.publishedAt && (
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(doc.publishedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenDocument(doc.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg text-xs font-medium transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read</span>
                  </button>

                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Open external link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

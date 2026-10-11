import React from 'react';
import { ExternalLink, BookOpen, Layers } from 'lucide-react';
import type { SearchResult } from '../../../../shared/types.js';

interface SearchResultCardProps {
  result: SearchResult;
  onOpenDocument: (documentId: string) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onOpenDocument,
}) => {
  const percentage = Math.round(result.similarity * 100);

  // Badge styling based on similarity score
  const getBadgeStyle = () => {
    if (percentage >= 75) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (percentage >= 50) {
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-3 transition-all group">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm group-hover:text-sky-300 transition-colors line-clamp-1">
            {result.documentTitle}
          </h4>
          <a
            href={result.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-500 hover:text-slate-400 flex items-center space-x-1 truncate"
          >
            <span className="truncate">{result.documentUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>

        {/* Similarity Score Badge */}
        <span
          className={`shrink-0 px-2.5 py-1 rounded-xl border text-xs font-bold tracking-tight ${getBadgeStyle()}`}
        >
          {percentage}% Match
        </span>
      </div>

      {/* Snippet */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
        <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
          {result.content}
        </p>
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <Layers className="w-3 h-3 text-slate-600" />
            <span>Chunk #{result.chunkIndex + 1}</span>
          </span>
          {result.publishedAt && (
            <span>• {new Date(result.publishedAt).toLocaleDateString()}</span>
          )}
        </div>

        <button
          onClick={() => onOpenDocument(result.documentId)}
          className="flex items-center space-x-1 text-slate-400 hover:text-sky-400 transition-colors text-xs font-medium"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Article</span>
        </button>
      </div>
    </div>
  );
};

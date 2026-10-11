import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';
import type { SearchResult } from '../../../../shared/types.js';

interface CitationCardProps {
  citation: SearchResult;
  index: number;
  onOpenDocument?: (docId: string) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index,
  onOpenDocument,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const percentage = Math.round(citation.similarity * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all text-xs">
      {/* Clickable Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center space-x-2 min-w-0 pr-2">
          <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
            {index + 1}
          </span>
          <span className="font-semibold text-slate-200 truncate">
            {citation.documentTitle}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono shrink-0">
            {percentage}%
          </span>
        </div>

        <div className="text-slate-500 shrink-0">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Details */}
      {isOpen && (
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 space-y-2 text-[11px]">
          <p className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
            {citation.content}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-500 text-[10px]">
            <span>Chunk #{citation.chunkIndex + 1}</span>
            <div className="flex items-center space-x-3">
              {onOpenDocument && (
                <button
                  onClick={() => onOpenDocument(citation.documentId)}
                  className="flex items-center space-x-1 text-sky-400 hover:text-sky-300"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Read Article</span>
                </button>
              )}
              <a
                href={citation.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 hover:text-slate-400"
              >
                <span>Original Link</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
